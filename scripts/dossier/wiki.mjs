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
        throw new Error(`HTTP ${response.status}`);
      } catch (error) {
        if (attempt >= 3) throw error;
        await pause(1500 * (attempt + 1));
      }
    }
  };
  const cached = async (key, load) => {
    const file = join(dir, `${safe(key)}.json`);
    if (existsSync(file)) return JSON.parse(readFileSync(file, 'utf8'));
    const value = await load();
    writeFileSync(file, JSON.stringify(value));
    await pause(200);
    return value;
  };
  return {
    /** Le wikitexte et les catégories d'une page, ou null si elle n'existe pas. */
    page: title => cached(`page-${title}`, async () => {
      const result = await call({ action: 'parse', page: title, prop: 'wikitext|categories', redirects: '1' });
      return result.parse ? { title: result.parse.title, wikitext: result.parse.wikitext['*'], categories: result.parse.categories.map(c => c['*']) } : null;
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
