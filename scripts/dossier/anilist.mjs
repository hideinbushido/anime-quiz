// Les portraits du Dossier de L, pris sur AniList.
//
// AniList a une API publique (graphql.anilist.co) faite pour les applications tierces : elle
// donne, pour chaque anime et manga, sa liste de personnages avec leur portrait. Ce script
// récupère ces listes, rapproche chaque personnage de nos fiches par son nom, télécharge le
// portrait et le range en carré de 200 px sous public/dossier/<univers>/<identifiant>.webp.
// Un portrait déjà présent n'est jamais remplacé.
//
//   node scripts/dossier/anilist.mjs <dossier-de-travail> [univers…]
//
// Le dossier de travail garde les réponses de l'API et les images brutes : relancer le script
// ne refait aucune requête déjà faite. À la fin, il écrit la liste des personnages restés sans
// portrait (sans-portrait-<univers>.txt).
import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { NARUTO_ROSTER } from '../../src/dossier/data/naruto.roster.ts';
import { ONE_PIECE_ROSTER } from '../../src/dossier/data/onePiece.roster.ts';
import { DRAGON_BALL_ROSTER } from '../../src/dossier/data/dragonBall.roster.ts';

const [work, ...only] = process.argv.slice(2);
if (!work) { console.log('Usage : node scripts/dossier/anilist.mjs <dossier-de-travail> [naruto|one-piece|dragon-ball…]'); process.exit(1); }

// Chaque univers : ses fiches, et les œuvres AniList (anime et manga) où chercher ses personnages
const UNIVERS = {
  naruto: { roster: NARUTO_ROSTER, oeuvres: [['ANIME', 'Naruto'], ['ANIME', 'Naruto: Shippuden'], ['MANGA', 'Naruto']] },
  'one-piece': { roster: ONE_PIECE_ROSTER, oeuvres: [['ANIME', 'One Piece'], ['MANGA', 'One Piece']] },
  'dragon-ball': { roster: DRAGON_BALL_ROSTER, oeuvres: [['ANIME', 'Dragon Ball'], ['ANIME', 'Dragon Ball Z'], ['ANIME', 'Dragon Ball GT'], ['ANIME', 'Dragon Ball Super'], ['MANGA', 'Dragon Ball'], ['MANGA', 'Dragon Ball Super']] },
};

const pause = ms => new Promise(resolve => setTimeout(resolve, ms));
mkdirSync(join(work, 'api'), { recursive: true });
mkdirSync(join(work, 'brut'), { recursive: true });

/** Une requête à l'API, mise en cache, à la cadence permise (30 par minute). */
async function graphql(cle, query, variables) {
  const cache = join(work, 'api', `${cle}.json`);
  if (existsSync(cache)) return JSON.parse(readFileSync(cache, 'utf8'));
  for (let essai = 0; essai < 6; essai++) {
    const response = await fetch('https://graphql.anilist.co', {
      method: 'POST', headers: { 'content-type': 'application/json', accept: 'application/json' },
      body: JSON.stringify({ query, variables }),
    });
    if (response.status === 429) { await pause((Number(response.headers.get('retry-after')) || 60) * 1000 + 500); continue; }
    const json = await response.json();
    if (json.errors) throw new Error(`${cle} : ${JSON.stringify(json.errors)}`);
    writeFileSync(cache, JSON.stringify(json.data));
    await pause(2200);
    return json.data;
  }
  throw new Error(`${cle} : trop de refus de l'API`);
}

const TROUVER = `query($search: String, $type: MediaType) { Page(perPage: 1) { media(search: $search, type: $type, sort: SEARCH_MATCH) { id title { romaji english } } } }`;
const PERSONNAGES = `query($id: Int, $page: Int) { Media(id: $id) { characters(page: $page, perPage: 50) { pageInfo { hasNextPage } nodes { id favourites name { full native alternative } image { large } } } } }`;

/** Deux noms se valent sans tenir compte des accents, de la ponctuation, de l'ordre des mots ni des voyelles doublées (Gokuu, Shippuuden). */
function cle(nom) {
  const mots = nom.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ').trim().split(' ').filter(Boolean)
    .map(mot => mot.replace(/ou/g, 'o').replace(/([aeiou])\1+/g, '$1'));
  return mots.sort().join(' ');
}

for (const [univers, { roster, oeuvres }] of Object.entries(UNIVERS)) {
  if (only.length && !only.includes(univers)) continue;

  // 1. Les personnages de toutes les œuvres de l'univers, sans doublon
  const personnages = new Map();
  for (const [type, titre] of oeuvres) {
    const trouve = await graphql(`media-${type}-${titre}`.replace(/[^a-z0-9-]+/gi, '_'), TROUVER, { search: titre, type });
    const media = trouve.Page.media[0];
    if (!media) { console.log(`${univers} : « ${titre} » introuvable sur AniList`); continue; }
    let page = 1, suite = true, avant = personnages.size;
    while (suite) {
      const data = await graphql(`perso-${media.id}-${page}`, PERSONNAGES, { id: media.id, page });
      for (const node of data.Media.characters.nodes) personnages.set(node.id, node);
      suite = data.Media.characters.pageInfo.hasNextPage;
      page++;
    }
    console.log(`${univers} : ${type.toLowerCase()} « ${media.title.romaji} » (${media.id}), ${personnages.size - avant} personnages de plus`);
  }

  // 2. Un index des noms AniList : le nom complet d'abord, les autres noms ensuite
  const index = (noms) => {
    const map = new Map();
    for (const node of personnages.values()) {
      if (!node.image?.large || /default/i.test(node.image.large)) continue;
      for (const nom of noms(node)) {
        if (!nom) continue;
        const k = cle(nom);
        if (!k) continue;
        // Deux personnages sous le même nom : le plus connu l'emporte
        const deja = map.get(k);
        if (!deja || node.favourites > deja.favourites) map.set(k, node);
      }
    }
    return map;
  };
  const parNom = index(node => [node.name.full]);
  const parAutreNom = index(node => node.name.alternative ?? []);

  // 3. Chaque fiche cherche son personnage : son nom, puis ses autres noms (à deux mots au moins, pour éviter les confusions)
  const dossier = join('public', 'dossier', univers);
  mkdirSync(dossier, { recursive: true });
  const existants = new Set(readdirSync(dossier).map(file => file.replace(/\.(png|jpe?g|webp|avif)$/i, '').toLowerCase()));
  const sans = [];
  let ranges = 0, deja = 0;
  const exact = fiche => {
    const noms = [fiche.name, ...(fiche.aliases ?? [])];
    return parNom.get(cle(fiche.name)) ?? parAutreNom.get(cle(fiche.name))
      ?? noms.slice(1).map(alias => cle(alias)).filter(k => k.includes(' ')).map(k => parNom.get(k) ?? parAutreNom.get(k)).find(Boolean)
      ?? noms.slice(1).map(alias => cle(alias)).map(k => parNom.get(k)).find(Boolean);
  };
  // Second passage, pour les noms écrits autrement (« Luffy Monkey » sans le « D. », « Tsunade Senju » avec le clan) :
  // les mots de l'un contiennent ceux de l'autre. Accepté seulement si un seul personnage AniList convient,
  // et s'il ne convient qu'à une seule fiche : sinon on préfère l'initiale à un mauvais visage.
  const mots = nom => cle(nom).split(' ').filter(mot => mot.length > 1);
  const inclus = (petit, grand) => petit.length > 0 && petit.every(mot => grand.includes(mot));
  const avecImage = [...personnages.values()].filter(node => node.image?.large && !/default/i.test(node.image.large));
  const approche = new Map();
  for (const fiche of roster) {
    if (existants.has(fiche.id) || exact(fiche)) continue;
    const a = mots(fiche.name);
    if (!a.length || a.join('').length < 4) continue;
    const candidats = avecImage.filter(node => [node.name.full, ...(node.name.alternative ?? [])].filter(Boolean).some(nom => { const b = mots(nom); return b.length && (inclus(a, b) || inclus(b, a)); }));
    if (candidats.length === 1) approche.set(fiche.id, candidats[0]);
  }
  const prisPar = new Map();
  for (const node of approche.values()) prisPar.set(node.id, (prisPar.get(node.id) ?? 0) + 1);
  for (const [id, node] of approche) if (prisPar.get(node.id) > 1) approche.delete(id);

  for (const fiche of roster) {
    if (existants.has(fiche.id)) { deja++; continue; }
    const node = exact(fiche) ?? approche.get(fiche.id);
    if (!node) { sans.push(fiche.name); continue; }

    // 4. Le portrait : téléchargé une fois, puis un carré de 200 px cadré sur le haut (là où est le visage)
    const extension = node.image.large.match(/\.(png|jpe?g|webp|gif)(\?|$)/i)?.[1] ?? 'jpg';
    const brut = join(work, 'brut', `${univers}-${fiche.id}.${extension}`);
    if (!existsSync(brut)) {
      const response = await fetch(node.image.large);
      if (!response.ok) { sans.push(`${fiche.name} (image refusée : ${response.status})`); continue; }
      writeFileSync(brut, Buffer.from(await response.arrayBuffer()));
      await pause(120);
    }
    const converti = spawnSync('ffmpeg', ['-v', 'error', '-y', '-i', brut, '-vf', "crop='min(iw,ih)':'min(iw,ih)':(iw-ow)/2:0,scale=200:200", '-frames:v', '1', '-c:v', 'libwebp', '-quality', '82', join(dossier, `${fiche.id}.webp`)]);
    if (converti.status === 0) ranges++;
    else sans.push(`${fiche.name} (conversion impossible)`);
  }
  writeFileSync(join(work, `sans-portrait-${univers}.txt`), sans.join('\n'));
  console.log(`${univers} : ${ranges} portraits rangés, ${deja} déjà là, ${sans.length} sans portrait sur ${roster.length}`);
}
