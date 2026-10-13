// Accès aux wikis Fandom par leur API publique, avec un cache local sur disque.
// Les pages téléchargées sont des données : elles ne sont jamais exécutées.
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/126.0 Safari/537.36';
const safe = name => name.replace(/[^A-Za-z0-9_.-]/g, '_').slice(0, 120);
const pause = ms => new Promise(resolve => setTimeout(resolve, ms));

export function wiki(name, cacheDir) {
  const dir = join(cacheDir, name);
  mkdirSync(dir, { recursive: true });
  const call = async params => {
    const url = `https://${name}.fandom.com/api.php?${new URLSearchParams({ format: 'json', ...params })}`;
    for (let attempt = 0; ; attempt++) {
      try {
        const response = await fetch(url, { headers: { 'user-agent': UA } });
        if (response.ok) return await response.json();
        // Le wiki demande de ralentir : on attend franchement avant de réessayer
        if (response.status === 429) { await pause(30000 * (attempt + 1)); if (attempt < 6) continue; }
        throw new Error(`HTTP ${response.status}`);
      } catch (error) {
        if (attempt >= 6) throw error;
        await pause(1500 * (attempt + 1));
      }
    }
  };
  const cached = async (key, load) => {
    const file = join(dir, `${safe(key)}.json`);
    if (existsSync(file)) return JSON.parse(readFileSync(file, 'utf8'));
    const value = await load();
    writeFileSync(file, JSON.stringify(value));
    await pause(120);
    return value;
  };
  const fileOf = title => join(dir, `${safe(`page-${title}`)}.json`);
  /**
   * Charge beaucoup de pages d'un coup, quarante par requête : c'est ce qui permet de lire un
   * wiki entier sans le harceler. Chaque page rejoint le cache, où `page()` la retrouve.
   */
  const pages = async titles => {
    const missing = titles.filter(title => !existsSync(fileOf(title)));
    for (let start = 0; start < missing.length; start += 25) {
      const chunk = missing.slice(start, start + 25);
      const found = new Map();
      const alias = new Map();
      for (let next = {}; next;) {
        const result = await call({ action: 'query', prop: 'revisions|categories', rvprop: 'content', rvslots: 'main', cllimit: 'max', redirects: '1', titles: chunk.join('|'), ...next });
        for (const { from, to } of [...(result.query?.normalized ?? []), ...(result.query?.redirects ?? [])]) alias.set(from, to);
        for (const item of Object.values(result.query?.pages ?? {})) {
          if (item.missing !== undefined) continue;
          const entry = found.get(item.title) ?? { title: item.title, wikitext: null, categories: [] };
          const text = item.revisions?.[0]?.slots?.main?.['*'];
          if (text !== undefined) entry.wikitext = text;
          entry.categories.push(...(item.categories ?? []).map(category => category.title.replace(/^Category:/, '').replace(/ /g, '_')));
          found.set(item.title, entry);
        }
        next = result.continue ?? null;
      }
      for (const title of chunk) {
        let target = title;
        for (let hop = 0; hop < 4 && alias.has(target); hop++) target = alias.get(target);
        const entry = found.get(target);
        writeFileSync(fileOf(title), JSON.stringify(entry && entry.wikitext !== null ? { ...entry, categories: [...new Set(entry.categories)] } : null));
      }
      await pause(1800);
      if (missing.length > 200) process.stdout.write(`\r  ${name} : ${Math.min(start + 25, missing.length)}/${missing.length} pages`);
    }
    if (missing.length > 200) process.stdout.write('\n');
  };
  return {
    pages,
    /** Le wikitexte et les catégories d'une page, ou null si elle n'existe pas. */
    page: title => cached(`page-${title}`, async () => {
      const result = await call({ action: 'parse', page: title, prop: 'wikitext|categories', redirects: '1' });
      return result.parse ? { title: result.parse.title, wikitext: result.parse.wikitext['*'], categories: result.parse.categories.map(c => c['*']) } : null;
    }),
    /** Tous les titres de pages d'une catégorie (les articles seulement). */
    category: title => cached(`category-${title}`, async () => {
      const titles = [];
      for (let next = {}; next;) {
        const result = await call({ action: 'query', list: 'categorymembers', cmtitle: title, cmnamespace: '0', cmlimit: '500', ...next });
        titles.push(...(result.query?.categorymembers ?? []).map(member => member.title));
        next = result.continue ?? null;
      }
      return titles;
    }),
    /** Une requête Semantic MediaWiki complète (toutes les pages de résultats). */
    ask: query => cached(`ask-${query}`, async () => {
      const results = {};
      for (let offset = 0; offset !== null;) {
        const result = await call({ action: 'ask', query: `${query}|limit=500|offset=${offset}` });
        Object.assign(results, result.query?.results ?? {});
        offset = result['query-continue-offset'] ?? null;
      }
      return results;
    }),
  };
}

/** Applique `work` à chaque élément, quelques-uns à la fois, en gardant l'ordre des résultats. */
export async function pool(items, size, work) {
  const results = new Array(items.length);
  let next = 0;
  await Promise.all(Array.from({ length: size }, async () => {
    while (next < items.length) { const index = next++; results[index] = await work(items[index], index); }
  }));
  return results;
}

/** Un identifiant stable et unique à partir d'un nom, pour un roster entier. */
export function slugger() {
  const used = new Set();
  return name => {
    const base = name.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'personnage';
    let slug = base;
    for (let n = 2; used.has(slug); n++) slug = `${base}-${n}`;
    used.add(slug);
    return slug;
  };
}

/** Les champs d'un modèle « {{Nom | clé = valeur | … }} », à plat. */
export function templateFields(wikitext, namePattern) {
  const start = wikitext.search(namePattern);
  if (start < 0) return null;
  // On avance jusqu'à l'accolade fermante du modèle, en comptant les accolades imbriquées
  let depth = 0, end = start;
  for (let i = start; i < wikitext.length - 1; i++) {
    const two = wikitext.slice(i, i + 2);
    if (two === '{{') { depth++; i++; } else if (two === '}}') { depth--; i++; if (depth === 0) { end = i; break; } }
  }
  const body = wikitext.slice(start, end);
  const fields = {};
  for (const match of body.matchAll(/\n[ \t]*\|[ \t]*([A-Za-z0-9 _-]+?)[ \t]*=[ \t]*([\s\S]*?)(?=\n[ \t]*\|[ \t]*[A-Za-z0-9 _-]+?[ \t]*=|$)/g)) fields[match[1].trim().toLowerCase()] = match[2].trim();
  return fields;
}

/** Retire les notes, les références et la mise en forme d'une valeur de wikitexte. */
export function plain(value) {
  return value
    .replace(/<ref[^>]*\/>/g, '').replace(/<ref[^>]*>[\s\S]*?<\/ref>/g, '')
    .replace(/\{\{Qref[^{}]*(\{\{[^{}]*\}\}[^{}]*)*\}\}/gi, '')
    .replace(/\[\[(?:[^|\]]*\|)?([^\]]*)\]\]/g, '$1')
    .replace(/'''?/g, '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
}
