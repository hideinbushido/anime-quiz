// Construit src/dossier/data/naruto.ts à partir du wiki Naruto (naruto.fandom.com).
//
//   node scripts/dossier/build-naruto.mjs <dossier-de-cache> [--write]
//
// Sans --write, le script affiche ce qu'il a lu, pour relecture. Le wiki sert
// de source ; les colonnes, les traductions et les regroupements sont les nôtres.
import { writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { wiki, templateFields, pool, slugger } from './wiki.mjs';

const [cacheDir, flag] = process.argv.slice(2);
if (!cacheDir) throw new Error('Usage : node scripts/dossier/build-naruto.mjs <dossier-de-cache> [--write]');
const naruto = wiki('naruto', cacheDir);

/**
 * Le roster est complet : tous les personnages du wiki qui apparaissent dans le manga Naruto.
 * Cette liste ne sert qu'à donner un nom d'affichage ou des surnoms aux plus connus.
 */
const KNOWN = [
  ['Naruto Uzumaki', null, ['Naruto']], ['Sasuke Uchiha', null, ['Sasuke']], ['Sakura Haruno', null, ['Sakura']],
  ['Kakashi Hatake', null, ['Kakashi', 'Le Ninja Copieur']], ['Iruka Umino', null, ['Iruka']],
  ['Hiruzen Sarutobi', null, ['Hiruzen', 'Troisième Hokage', 'Sandaime']], ['Konohamaru Sarutobi', null, ['Konohamaru']],
  ['Zabuza Momochi', null, ['Zabuza']], ['Haku', null, []],
  ['Rock Lee', null, ['Lee']], ['Neji Hyūga', null, ['Neji', 'Neji Hyuga']], ['Tenten', null, []], ['Might Guy', null, ['Gaï', 'Gai', 'Gaï Maito', 'Maito Gai']],
  ['Hinata Hyūga', null, ['Hinata', 'Hinata Hyuga']], ['Kiba Inuzuka', null, ['Kiba']], ['Shino Aburame', null, ['Shino']], ['Kurenai Yūhi', null, ['Kurenai', 'Kurenai Yuhi']],
  ['Shikamaru Nara', null, ['Shikamaru']], ['Ino Yamanaka', null, ['Ino']], ['Chōji Akimichi', null, ['Choji', 'Chôji', 'Choji Akimichi']], ['Asuma Sarutobi', null, ['Asuma']],
  ['Gaara', null, ['Gaara du Désert']], ['Temari', null, []], ['Kankurō', null, ['Kankuro', 'Kankurô']], ['Chiyo', null, ['Mamie Chiyo']],
  ['Orochimaru', null, []], ['Kabuto Yakushi', null, ['Kabuto']], ['Kimimaro', null, []], ['Anko Mitarashi', null, ['Anko']],
  ['Jiraiya', null, ['Ero-sennin']], ['Tsunade', null, ['Cinquième Hokage', 'Godaime']], ['Shizune', null, []],
  ['Hashirama Senju', null, ['Hashirama', 'Premier Hokage', 'Shodaime']], ['Tobirama Senju', null, ['Tobirama', 'Deuxième Hokage', 'Nidaime']],
  ['Minato Namikaze', null, ['Minato', 'Quatrième Hokage', 'Yondaime']], ['Kushina Uzumaki', null, ['Kushina']],
  ['Itachi Uchiha', null, ['Itachi']], ['Kisame Hoshigaki', null, ['Kisame']], ['Deidara', null, []], ['Sasori', null, []],
  ['Hidan', null, []], ['Kakuzu', null, []], ['Nagato', null, ['Pain', 'Pein']], ['Konan', null, []], ['Yahiko', null, []],
  ['Obito Uchiha', null, ['Obito', 'Tobi']], ['Madara Uchiha', null, ['Madara']], ['Shisui Uchiha', null, ['Shisui']],
  ['Sai', null, []], ['Yamato', null, ['Tenzō', 'Tenzo']], ['Danzō Shimura', null, ['Danzo', 'Danzô']],
  ['Suigetsu Hōzuki', null, ['Suigetsu']], ['Karin', null, []], ['Jūgo', null, ['Jugo', 'Jûgo']],
  ['Killer B', null, ['Killer Bee', 'Bee']], ['A (Fourth Raikage)', 'A (Quatrième Raikage)', ['Raikage', 'Ay']], ['Darui', null, []],
  ['Ōnoki', null, ['Onoki', 'Tsuchikage']], ['Mei Terumī', null, ['Mei Terumi', 'Mizukage']],
  ['Kaguya Ōtsutsuki', null, ['Kaguya']], ['Hagoromo Ōtsutsuki', null, ['Hagoromo', "L'Ermite Rikudō"]],
];

const VILLAGES = { Konohagakure: 'Konoha', Sunagakure: 'Suna', Kirigakure: 'Kiri', Kumogakure: 'Kumo', Iwagakure: 'Iwa', Amegakure: 'Ame',
  Otogakure: 'Oto', Takigakure: 'Taki', Yugakure: 'Yugakure', Uzushiogakure: 'Uzushio', Kusagakure: 'Kusa' };
const NATURES = { 'Fire Release': 'Feu', 'Wind Release': 'Vent', 'Lightning Release': 'Foudre', 'Earth Release': 'Terre', 'Water Release': 'Eau' };
/** Les trois grands types de jutsu : les spécialités (fûinjutsu, kenjutsu, senjutsu…) ne font pas partie du jeu. */
const JUTSU = { Ninjutsu: 'Ninjutsu', Genjutsu: 'Genjutsu', Taijutsu: 'Taijutsu' };
/** Les arcs du manga, par chapitre de début. */
const ARCS = [[1, 'Pays des Vagues'], [34, 'Examen Chūnin'], [116, 'Destruction de Konoha'], [139, 'Recherche de Tsunade'], [172, 'Poursuite de Sasuke'],
  [239, 'Kakashi Gaiden'], [245, 'Sauvetage du Kazekage'], [282, 'Pont Tenchi'], [311, 'Hidan et Kakuzu'], [343, "Poursuite d'Itachi"],
  [368, 'Histoire de Jiraiya'], [384, 'Combat des frères Uchiha'], [413, 'Invasion de Pain'], [454, 'Sommet des cinq Kage'], [484, 'Quatrième Grande Guerre']];
const MEDIA_ONLY = /\b(anime|novel|game|movie|ova|boruto)[^;]*only\b/i;
/**
 * Ce que le wiki ne peut pas trancher pour nous, corrigé à la main :
 * le wiki donne le clan par alliance (Sakura « Uchiha », Temari « Nara »…), alors
 * que le jeu attend le clan de naissance ; et il note « Various » le sexe d'Orochimaru.
 */
const CORRECTIONS = {
  'Sakura Haruno': { clan: null }, 'Kurenai Yūhi': { clan: null }, Sai: { clan: null }, Temari: { clan: 'Kazekage' },
  Orochimaru: { sexe: 'Homme' },
};

/**
 * Le wiki rattache à l'Akatsuki ceux qui n'ont fait que s'allier à elle (Sasuke et son équipe Taka, Kabuto).
 * Pour le jeu, « Akatsuki » désigne ses membres : ceux-là n'en sont pas.
 */
const ALLIES_ONLY = new Set(['Sasuke Uchiha', 'Suigetsu Hōzuki', 'Karin', 'Jūgo', 'Kabuto Yakushi']);

/** Une liste du wiki : « A, B~~note, C », sans ce qui n'existe que hors manga ni ce qui n'a été que provisoire. */
const list = value => (value ?? '').replace(/<!--[\s\S]*?-->/g, '').split(',').map(item => item.trim()).filter(Boolean)
  .map(item => {
    const [name, ...notes] = item.split(/~+/);
    // « Cible|Texte affiché » : on garde la cible, sauf quand le texte nomme une autre équipe (« Sannin|Team Hiruzen »)
    const [target, shown] = name.replace(/\[\[|\]\]/g, '').split('|').map(part => part.trim());
    return { name: shown?.startsWith('Team') ? shown : target, note: notes.join(';') };
  })
  .filter(item => item.name && !/temporar/i.test(item.note)
    && !(item.note && item.note.split(';').every(part => !part.trim() || MEDIA_ONLY.test(part))));
const unique = values => [...new Set(values)];
const known = new Map(KNOWN.map(([title, display, aliases]) => [title, { display, aliases }]));
const titles = unique([...KNOWN.map(([title]) => title), ...await naruto.category('Category:Characters')]);

// Les techniques du manga, en une seule requête : qui s'en sert, et comment elles sont classées
const jutsu = await naruto.ask('[[Category:Jutsu]]|?User tech|?Jutsu classification|?Appears in');
const techniques = new Map();
for (const [name, item] of Object.entries(jutsu)) {
  if (!(item.printouts['Appears in'] ?? []).includes('Manga')) continue;
  const types = (item.printouts['Jutsu classification'] ?? []).map(type => type.fulltext);
  for (const user of item.printouts['User tech'] ?? []) {
    const who = user.Page?.item?.[0]?.fulltext;
    if (!who) continue;
    const entry = techniques.get(who) ?? { counts: {}, names: new Set() };
    for (const type of types) entry.counts[type] = (entry.counts[type] ?? 0) + 1;
    entry.names.add(name);
    techniques.set(who, entry);
  }
}

const slug = slugger();
await naruto.pages(titles.map(title => `Infobox:${title}`));
const sheets = await pool(titles, 1, async title => ({ title, infobox: await naruto.page(`Infobox:${title}`) }));
const roster = [];
for (const { title, infobox } of sheets) {
  const { display = null, aliases = [] } = known.get(title) ?? {};
  const fields = infobox && templateFields(infobox.wikitext, /\{\{Infobox\/Naruto\/Character/);
  // Seuls comptent les personnages nommés du manga Naruto : ni les anonymes, ni ceux de l'anime, des films, des jeux ou de Boruto
  // (« boruto=Yes » : le chapitre de première apparition est un chapitre de Boruto, pas de Naruto)
  if (!fields || /yes/i.test(fields['unnamed character'] ?? '') || /yes/i.test(fields.boruto ?? '') || fields['manga type'] !== 'Chapter' || !(Number(fields['manga debut']) >= 1 && Number(fields['manga debut']) <= 700)) continue;

  const { counts = {}, names = new Set() } = techniques.get(title) ?? {};
  // Une technique isolée ne fait pas une spécialité : trois techniques du manga pour compter, deux pour le genjutsu, plus rare
  const classes = list(fields.classification).map(item => item.name);
  const practises = type => (counts[type] ?? 0) >= (type === 'Genjutsu' ? 2 : 3);
  let typesJutsu = Object.keys(JUTSU).filter(practises).map(type => JUTSU[type]);
  // À défaut, son type le plus fréquent ; un civil sans aucune technique n'en a pas
  if (!typesJutsu.length) typesJutsu = Object.keys(JUTSU).filter(type => counts[type]).sort((a, b) => counts[b] - counts[a]).slice(0, 1).map(type => JUTSU[type]);
  const summoner = names.has('Summoning Technique');

  const affiliations = list(fields.affiliations);
  const village = affiliations.map(item => VILLAGES[item.name]).find(Boolean) ?? null;
  const classification = classes;
  const chapter = Number(fields['manga debut']);
  const arc = fields['manga type'] === 'Chapter' && chapter ? [...ARCS].reverse().find(([from]) => chapter >= from)[1] : null;
  const clan = list(fields.clan)[0]?.name.replace(/ Clan$/, '').replace(/'s$/, '') ?? null;

  roster.push({
    id: slug(title), title, image: fields['image name'] ?? null,
    name: display ?? title, aliases,
    attributes: {
      sexe: fields.gender === 'Female' ? 'Femme' : fields.gender === 'Male' ? 'Homme' : null,
      // Le village, et l'Akatsuki pour ceux qui en ont fait partie : rien de plus
      affiliations: [...(village ? [village] : []), ...(affiliations.some(item => item.name === 'Akatsuki') && !ALLIES_ONLY.has(title) ? ['Akatsuki'] : [])],
      clan,
      typesJutsu,
      naturesChakra: unique(list(fields['nature type']).flatMap(item => (NATURES[item.name] ? [NATURES[item.name]] : []))),
      statutSpecial: [...(classification.includes('Jinchūriki') ? ['Jinchūriki'] : []), ...(classification.includes('Sage') ? ['Ermite'] : []), ...(summoner ? ['Invocateur'] : []),
        ...(classification.includes('Missing-nin') ? ['Ninja déserteur'] : []), ...(classification.includes('Medical-nin') ? ['Ninja médical'] : [])],
      premiereApparition: arc,
    },
    debug: { chapter, counts, classification },
  });
  Object.assign(roster.at(-1).attributes, CORRECTIONS[title] ?? {});
}

if (flag !== '--write') {
  const only = flag ? roster.filter(character => character.name.toLowerCase().includes(flag.toLowerCase())) : roster.slice(0, 40);
  for (const character of only) {
    const a = character.attributes;
    console.log(`${character.name} | ${a.sexe} | ${a.affiliations.join(', ')} | ${a.clan} | ${a.typesJutsu.join(', ')} | ${a.naturesChakra.join(', ')} | ${a.statutSpecial.join(', ')} | ${a.premiereApparition} (ch.${character.debug.chapter})`);
  }
  console.log(`\n${roster.length} personnages sur ${titles.length} pages du wiki`);
} else {
  writeFileSync(join(cacheDir, 'images-naruto.json'), JSON.stringify(Object.fromEntries(roster.filter(character => character.image).map(character => [character.id, character.image]))));
  writeFileSync(join(cacheDir, 'pages-naruto.json'), JSON.stringify(Object.fromEntries(roster.map(character => [character.id, character.title]))));
  const lines = roster.map(({ id, name, aliases, attributes }) => `  ${JSON.stringify({ id, name, ...(aliases.length ? { aliases } : {}), attributes })},`);
  writeFileSync('src/dossier/data/naruto.roster.ts', `// GÉNÉRÉ par scripts/dossier/build-naruto.mjs à partir de naruto.fandom.com — ne pas modifier à la main.
// Pour corriger une fiche : ajuster le script (traductions, roster) ou la table de corrections de naruto.ts.
import type { DossierCharacter } from "../types";

export const NARUTO_ROSTER: DossierCharacter[] = [
${lines.join('\n')}
];
`);
  console.log(`${roster.length} personnages écrits dans src/dossier/data/naruto.roster.ts`);
}
