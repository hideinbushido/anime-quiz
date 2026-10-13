// Les portraits du Dossier de L.
//
// Le serveur d'images des wikis refuse les téléchargements automatiques : ce script ne
// télécharge donc rien. Il fait les deux choses qui restent utiles autour d'un
// téléchargement fait à la main (depuis un navigateur) :
//
//   node scripts/dossier/images.mjs liste <dossier-de-cache>
//       écrit public/dossier/<univers>/portraits.json : pour chaque personnage, le nom du
//       fichier de son portrait principal sur le wiki.
//
//   node scripts/dossier/images.mjs ranger <dossier-d-images> [univers…]
//       prend les images téléchargées (sous leur nom du wiki, ou sous l'identifiant du
//       personnage), les réduit en carrés de 200 px et les range sous
//       public/dossier/<univers>/<identifiant>.webp. A besoin de ffmpeg.
import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const [command, folder, ...only] = process.argv.slice(2);
const WIKIS = { naruto: 'naruto', 'one-piece': 'onepiece', 'dragon-ball': 'dragonball' };
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/126.0 Safari/537.36';
const pause = ms => new Promise(resolve => setTimeout(resolve, ms));
/** Deux noms de fichier se valent sans tenir compte de la casse, des espaces, des tirets bas ni de l'extension. */
const key = name => decodeURIComponent(name).replace(/\.[a-z0-9]+$/i, '').replace(/[\s_]+/g, ' ').trim().toLowerCase();

if (command === 'liste') {
  for (const [universe, wiki] of Object.entries(WIKIS)) {
    const pages = Object.entries(JSON.parse(readFileSync(join(folder, `pages-${universe}.json`), 'utf8')));
    const portraits = {};
    // Naruto range le portrait dans la fiche du personnage : le script de construction l'a déjà noté
    const known = existsSync(join(folder, `images-${universe}.json`)) ? JSON.parse(readFileSync(join(folder, `images-${universe}.json`), 'utf8')) : null;
    if (known) Object.assign(portraits, known);
    else for (let start = 0; start < pages.length; start += 50) {
      const chunk = pages.slice(start, start + 50);
      const url = `https://${wiki}.fandom.com/api.php?${new URLSearchParams({ action: 'query', format: 'json', prop: 'pageimages', piprop: 'name', pilimit: '50', redirects: '1', titles: chunk.map(([, title]) => title).join('|') })}`;
      const result = await (await fetch(url, { headers: { 'user-agent': UA } })).json();
      const alias = new Map([...(result.query?.normalized ?? []), ...(result.query?.redirects ?? [])].map(({ from, to }) => [from, to]));
      const names = new Map(Object.values(result.query?.pages ?? {}).map(page => [page.title, page.pageimage]));
      for (const [id, title] of chunk) {
        let target = title;
        for (let hop = 0; hop < 4 && alias.has(target); hop++) target = alias.get(target);
        if (names.get(target)) portraits[id] = names.get(target).replace(/_/g, ' ');
      }
      await pause(1500);
    }
    mkdirSync(join('public', 'dossier', universe), { recursive: true });
    writeFileSync(join('public', 'dossier', universe, 'portraits.json'), JSON.stringify(portraits, null, 1));
    console.log(`${universe} : ${Object.keys(portraits).length} portraits repérés sur ${pages.length} personnages`);
  }
} else if (command === 'ranger') {
  const files = readdirSync(folder).filter(file => /\.(png|jpe?g|webp|avif|gif)$/i.test(file));
  const byKey = new Map(files.map(file => [key(file), file]));
  for (const universe of Object.keys(WIKIS)) {
    if (only.length && !only.includes(universe)) continue;
    const target = join('public', 'dossier', universe);
    const portraits = JSON.parse(readFileSync(join(target, 'portraits.json'), 'utf8'));
    let done = 0;
    for (const [id, name] of Object.entries(portraits)) {
      const file = byKey.get(key(name)) ?? byKey.get(id);
      if (!file) continue;
      // Un carré de 200 px, cadré sur le haut de l'image : c'est là qu'est le visage
      const converted = spawnSync('ffmpeg', ['-v', 'error', '-y', '-i', join(folder, file), '-vf', "crop='min(iw,ih)':'min(iw,ih)':(iw-ow)/2:0,scale=200:200", '-frames:v', '1', '-c:v', 'libwebp', '-quality', '80', join(target, `${id}.webp`)]);
      if (converted.status === 0) done++;
    }
    console.log(`${universe} : ${done} portraits rangés`);
  }
} else {
  console.log('Usage : node scripts/dossier/images.mjs liste <dossier-de-cache>  |  ranger <dossier-d-images> [univers…]');
}
