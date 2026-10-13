// Construit src/dossier/data/naruto.ts à partir du wiki Naruto (naruto.fandom.com).
//
//   node scripts/dossier/build-naruto.mjs <dossier-de-cache> [--write]
//
// Sans --write, le script affiche ce qu'il a lu, pour relecture. Le wiki sert
// de source ; les colonnes, les traductions et les regroupements sont les nôtres.
import { writeFileSync } from 'node:fs';
import { wiki, templateFields } from './wiki.mjs';

const [cacheDir, flag] = process.argv.slice(2);
if (!cacheDir) throw new Error('Usage : node scripts/dossier/build-naruto.mjs <dossier-de-cache> [--write]');
const naruto = wiki('naruto', cacheDir);

/** Le roster : le titre de la page du wiki, puis le nom affiché et les surnoms si besoin. */
const ROSTER = [
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
const AFFILIATIONS = { ...VILLAGES, Akatsuki: 'Akatsuki', 'Allied Shinobi Forces': 'Alliance Shinobi', Root: 'Racine',
  'Mount Myōboku': 'Mont Myōboku', 'Ryūchi Cave': 'Grotte Ryūchi', 'Shikkotsu Forest': 'Forêt Shikkotsu', 'Land of Iron': 'Pays du Fer' };
const TEAMS = { 'Team Kakashi': 'Équipe 7', 'Team 7': 'Équipe 7', 'Team Guy': 'Équipe Gaï', 'Team Asuma': 'Équipe 10', 'Team 10': 'Équipe 10',
  'Team Kurenai': 'Équipe 8', 'Team 8': 'Équipe 8', Sannin: 'Sannin', Taka: 'Taka', Hebi: 'Taka',
  'Team 10 (Asuma)': 'Équipe 10', 'Team Minato': 'Équipe Minato', 'Ame Orphans': "Orphelins d'Ame",
  'Seven Ninja Swordsmen of the Mist': 'Sept Épéistes de la Brume', 'Three Sand Siblings': 'Fratrie du Sable',
  'Twelve Guardian Ninja': 'Douze Ninjas Gardiens' };
const NATURES = { 'Fire Release': 'Feu', 'Wind Release': 'Vent', 'Lightning Release': 'Foudre', 'Earth Release': 'Terre', 'Water Release': 'Eau', 'Yin Release': 'Yin', 'Yang Release': 'Yang' };
const JUTSU = { Ninjutsu: 'Ninjutsu', Genjutsu: 'Genjutsu', Taijutsu: 'Taijutsu', Kenjutsu: 'Kenjutsu', 'Fūinjutsu': 'Fûinjutsu', 'Medical Ninjutsu': 'Iryō Ninjutsu', Senjutsu: 'Senjutsu' };
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
const unknown = new Map();
const translate = (table, kind) => items => unique(items.flatMap(({ name }) => {
  if (table[name]) return [table[name]];
  unknown.set(`${kind} : ${name}`, (unknown.get(`${kind} : ${name}`) ?? 0) + 1);
  return [];
}));

const roster = [];
for (const [title, display, aliases] of ROSTER) {
  const infobox = await naruto.page(`Infobox:${title}`);
  const fields = infobox && templateFields(infobox.wikitext, /\{\{Infobox\/Naruto\/Character/);
  if (!fields) { console.log('SANS FICHE', title); continue; }

  // Ses techniques, telles que le manga les montre, avec leur classification
  const techniques = await naruto.ask(`[[User tech::${title};?]]|?Jutsu classification|?Appears in`);
  const manga = Object.entries(techniques).filter(([, item]) => (item.printouts['Appears in'] ?? []).includes('Manga'));
  const counts = {};
  for (const [, item] of manga) for (const type of item.printouts['Jutsu classification'] ?? []) counts[type.fulltext] = (counts[type.fulltext] ?? 0) + 1;
  // Une technique isolée ne fait pas une spécialité : chaque type a son seuil. Le kenjutsu, toujours rare, compte dès la première.
  const classes = list(fields.classification).map(item => item.name);
  const practises = type => (counts[type] ?? 0) >= ({ Kenjutsu: 1, Genjutsu: 2 }[type] ?? 3)
    || (type === 'Medical Ninjutsu' && classes.includes('Medical-nin')) || (type === 'Senjutsu' && classes.includes('Sage'));
  let typesJutsu = Object.keys(JUTSU).filter(practises).map(type => JUTSU[type]);
  // Personne ne reste sans rien : à défaut, son type le plus fréquent
  if (!typesJutsu.length) typesJutsu = Object.keys(JUTSU).filter(type => counts[type]).sort((a, b) => counts[b] - counts[a]).slice(0, 1).map(type => JUTSU[type]);
  const summoner = manga.some(([name]) => name === 'Summoning Technique');

  const affiliations = list(fields.affiliations);
  const village = affiliations.map(item => VILLAGES[item.name]).find(Boolean) ?? null;
  const classification = classes;
  const anbu = /anbu/i.test(`${fields['rank-part1'] ?? ''} ${fields['rank-part2'] ?? ''} ${fields.occupations ?? ''}`);
  const chapter = Number(fields['manga debut']);
  const arc = fields['manga type'] === 'Chapter' && chapter ? [...ARCS].reverse().find(([from]) => chapter >= from)[1] : null;
  const clan = list(fields.clan)[0]?.name.replace(/ Clan$/, '').replace(/'s$/, '') ?? null;

  roster.push({
    id: title.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''),
    name: display ?? title, aliases,
    attributes: {
      sexe: fields.gender === 'Female' ? 'Femme' : fields.gender === 'Male' ? 'Homme' : fields.gender ?? null,
      village, clan,
      affiliations: unique([...translate(AFFILIATIONS, 'affiliation')(affiliations), ...translate(TEAMS, 'équipe')(list(fields.teams)), ...(classification.includes('Sannin') ? ['Sannin'] : []), ...(anbu ? ['ANBU'] : [])]),
      typesJutsu,
      naturesChakra: unique(list(fields['nature type']).flatMap(item => (NATURES[item.name] ? [NATURES[item.name]] : []))),
      statutSpecial: [...(classification.includes('Jinchūriki') ? ['Jinchūriki'] : []), ...(classification.includes('Sage') ? ['Ermite'] : []), ...(summoner ? ['Invocateur'] : [])],
      premiereApparition: arc,
    },
    debug: { chapter, counts, classification },
  });
  Object.assign(roster.at(-1).attributes, CORRECTIONS[title] ?? {});
}

if (flag !== '--write') {
  for (const character of roster) {
    const a = character.attributes;
    console.log(`${character.name} | ${a.sexe} | ${a.village} | ${a.clan} | ${a.affiliations.join(', ')} | ${a.typesJutsu.join(', ')} | ${a.naturesChakra.join(', ')} | ${a.statutSpecial.join(', ')} | ${a.premiereApparition} (ch.${character.debug.chapter})`);
    console.log('     ', JSON.stringify(character.debug.counts), '|', character.debug.classification.join(', '));
  }
  console.log('\nNon traduits (ignorés) :');
  for (const [name, count] of [...unknown].sort((x, y) => y[1] - x[1])) console.log(`  ${count} × ${name}`);
} else {
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
