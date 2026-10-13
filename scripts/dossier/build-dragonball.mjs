// Construit src/dossier/data/dragonBall.roster.ts à partir du wiki Dragon Ball (dragonball.fandom.com).
//
//   node scripts/dossier/build-dragonball.mjs <dossier-de-cache> [--write]
//
// Sans --write, le script affiche ce qu'il a lu, pour relecture.
import { writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { wiki, templateFields, plain, slugger } from './wiki.mjs';

const [cacheDir, flag] = process.argv.slice(2);
if (!cacheDir) throw new Error('Usage : node scripts/dossier/build-dragonball.mjs <dossier-de-cache> [--write]');
const dragonBall = wiki('dragonball', cacheDir);

/**
 * Le roster est complet : tous les personnages du wiki rangés dans Dragon Ball, Z, GT ou Super.
 * Cette liste ne sert qu'à donner un nom d'affichage ou des surnoms aux plus connus.
 */
const KNOWN = [
  ['Goku', 'Son Goku', ['Goku', 'Sangoku', 'Kakarot', 'Kakarotto']], ['Vegeta', 'Vegeta', ['Végéta']], ['Gohan', 'Son Gohan', ['Gohan', 'Sangohan']],
  ['Goten', 'Son Goten', ['Goten', 'Sangoten']], ['Trunks', null, []], ['Future Trunks', 'Trunks du futur', ['Mirai Trunks', 'Future Trunks']],
  ['Piccolo', null, ['Satan Petit-Cœur']], ['Krillin', null, ['Kuririn']], ['Yamcha', null, []], ['Tien Shinhan', 'Ten Shin Han', ['Tenshinhan', 'Tien']], ['Chiaotzu', 'Chaozu', ['Chiaotzu']],
  ['Master Roshi', 'Tortue Géniale', ['Kame Sennin', 'Muten Roshi', 'Master Roshi']], ['Bulma', null, []], ['Chi-Chi', null, ['Chichi']], ['Videl', null, []],
  ['Mr. Satan', null, ['Hercule', 'Mister Satan']], ['Pan', null, []], ['Uub', null, ['Oob']],
  ['Android 18', 'C-18', ['Android 18', 'Cyborg 18']], ['Android 17', 'C-17', ['Android 17', 'Cyborg 17']], ['Android 16', 'C-16', ['Android 16', 'Cyborg 16']], ['Dr. Gero', null, ['C-20']],
  ['Cell', null, []], ['Frieza', 'Freezer', ['Frieza']], ['Good Buu', 'Boo', ['Majin Buu', 'Bou', 'Buu']], ['Cooler', null, []],
  ['Raditz', null, []], ['Nappa', null, []], ['Bardock', null, ['Baddack']], ['Broly', null, []],
  ['Captain Ginyu', 'Ginyu', ['Capitaine Ginyu']], ['Zarbon', null, []], ['Dodoria', null, []], ['Dabura', null, []], ['Babidi', null, []],
  ['Beerus', null, []], ['Whis', null, []], ['Zamasu', null, []], ['Goku Black', 'Black Goku', ['Goku Black']], ['Jiren', null, []], ['Hit', null, []],
  ['Cabba', null, []], ['Caulifla', null, []], ['Kale', null, []], ['Toppo', null, []], ['Zeno', null, ['Roi Zeno']],
  ['Dende', null, []], ['King Kai', 'Maître Kaio', ['Kaio', 'King Kai']], ['Mr. Popo', null, ['Mister Popo']], ['Shin', 'Kaioshin', ['Shin', 'Supreme Kai']],
  ['Yajirobe', null, []], ['Korin', 'Maître Karin', ['Karin', 'Korin']], ['Launch', 'Lunch', ['Launch']], ['Pilaf', null, ['Empereur Pilaf']],
  ['Mercenary Tao', 'Tao Pai Pai', ['Tao']], ['King Piccolo', 'Piccolo Daimao', ['Roi Piccolo']],
];

/** La race, lue sur la première ligne du champ (les suivantes décrivent des états passagers ou des jeux vidéo). */
const RACES = [[/saiyan/i, 'Saiyan'], [/earthling|human/i, 'Humain'], [/namekian/i, 'Namek'], [/frieza/i, 'Race de Freezer'],
  [/android|cyborg/i, 'Android'], [/majin/i, 'Majin'], [/angel/i, 'Ange'], [/glind|shinjin|core person/i, 'Kaioshin'], [/demon realm/i, 'Démon']];
/** Les groupes retenus. Le wiki mêle le manga, les films et les jeux : on ne garde que ceux-ci. */
const GROUPS = [[/Dragon Team/, 'Z Fighters'], [/Ginyu Force/, 'Commando Ginyu'], [/Frieza Force/, 'Armée de Freezer'], [/Saiyan Army/, 'Armée Saiyan'],
  [/Red Ribbon Army/, 'Armée du Ruban Rouge'], [/Turtle School/, 'École de la Tortue'], [/Crane School/, 'École de la Grue'], [/Team Universe 7/, "Équipe de l'Univers 7"],
  [/Team Universe 6/, "Équipe de l'Univers 6"], [/Team Universe 11/, "Équipe de l'Univers 11"], [/Pride Troopers/, 'Pride Troopers'], [/Galactic Patrol/, 'Patrouille Galactique'],
  [/Capsule Corporation/, 'Capsule Corp.'], [/Organization of Babidi/, 'Bande de Babidi'], [/King Piccolo's Demon Clan/, 'Clan démoniaque de Piccolo'], [/Pilaf Gang/, 'Bande de Pilaf'],
  [/Sadala Army/, 'Armée de Sadala'], [/Cooler Force/, 'Armée de Cooler'], [/Zamases/, 'Plan Zéro Humain'], [/Dragon Clan/, 'Clan du Dragon']];
/** Un passage sous contrôle, pour un match de baseball ou dans un jeu vidéo n'est pas une affiliation. */
const PASSING = /baseball|brainwash|temporar|hired|undercover|heroes|xenoverse|what-if/i;
/**
 * L'univers d'origine n'est pas un champ du wiki : il est tenu ici à la main.
 * Tous les autres personnages du roster viennent de l'Univers 7.
 */
/**
 * Des affiliations que le wiki liste mais qui tromperaient un joueur : Goku
 * « soldat de Freezer » parce qu'il est né Saiyan, des méchants rangés dans
 * l'équipe de Goku pour une apparition dans un jeu… Elles sont retirées ici.
 */
const EXCLUDED = {
  Goku: ['Armée de Freezer', 'Armée Saiyan'], Uub: ['Armée de Freezer'], Raditz: ['Z Fighters'], Nappa: ['Z Fighters'],
  Dabura: ['Z Fighters'], Pilaf: ['Armée de Freezer', 'Clan démoniaque de Piccolo', 'Z Fighters'], 'Dr. Gero': ['Bande de Pilaf'],
  'Android 16': ['Capsule Corp.'],
};
/**
 * Ce que le wiki ne donne pas proprement, tenu ici à la main pour chaque personnage :
 * [origine, résidence, peut se transformer, premier arc]. La transformation se dit
 * seulement par Oui ou Non, jamais par son nom. « Oui » couvre toute forme alternative
 * (Super Saiyan, singe géant, formes de Freezer ou de Cell…).
 */
const FICHES = {
  Goku: ['Planète Vegeta', 'Mont Paozu', 'Oui', 'Pilaf'], Vegeta: ['Planète Vegeta', "Capitale de l'Ouest", 'Oui', 'Saiyans'],
  Gohan: ['Terre', 'Mont Paozu', 'Oui', 'Saiyans'], Goten: ['Terre', 'Mont Paozu', 'Oui', 'Boo'], Trunks: ['Terre', "Capitale de l'Ouest", 'Oui', 'Cyborgs'],
  'Future Trunks': ['Terre', "Capitale de l'Ouest", 'Oui', 'Cyborgs'], Piccolo: ['Terre', 'Palais du Tout-Puissant', 'Oui', 'Piccolo Daimao'],
  Krillin: ['Terre', 'Kame House', 'Non', '21e Tenkaichi Budokai'], Yamcha: ['Terre', "Capitale de l'Ouest", 'Non', 'Pilaf'],
  'Tien Shinhan': ['Terre', 'Inconnue', 'Non', '22e Tenkaichi Budokai'], Chiaotzu: ['Terre', 'Inconnue', 'Non', '22e Tenkaichi Budokai'],
  'Master Roshi': ['Terre', 'Kame House', 'Non', 'Pilaf'], Bulma: ['Terre', "Capitale de l'Ouest", 'Non', 'Pilaf'], 'Chi-Chi': ['Terre', 'Mont Paozu', 'Non', 'Pilaf'],
  Videl: ['Terre', 'Satan City', 'Non', 'Boo'], 'Mr. Satan': ['Terre', 'Satan City', 'Non', 'Cell'], Pan: ['Terre', 'Satan City', 'Non', 'Boo'], Uub: ['Terre', 'Inconnue', 'Non', 'Boo'],
  'Android 18': ['Terre', 'Kame House', 'Non', 'Cyborgs'], 'Android 17': ['Terre', 'Réserve naturelle', 'Non', 'Cyborgs'],
  'Android 16': ['Terre', 'Laboratoire du Dr Gero', 'Non', 'Cyborgs'], 'Dr. Gero': ['Terre', 'Laboratoire du Dr Gero', 'Non', 'Cyborgs'],
  Cell: ['Terre', 'Laboratoire du Dr Gero', 'Oui', 'Cell'], Frieza: ['Inconnue', 'Vaisseau de Freezer', 'Oui', 'Namek'], 'Good Buu': ['Inconnue', 'Satan City', 'Oui', 'Boo'],
  Cooler: ['Inconnue', 'Inconnue', 'Oui', 'Film'], Raditz: ['Planète Vegeta', 'Inconnue', 'Oui', 'Saiyans'], Nappa: ['Planète Vegeta', 'Inconnue', 'Oui', 'Saiyans'],
  Bardock: ['Planète Vegeta', 'Planète Vegeta', 'Oui', 'Film'], Broly: ['Planète Vegeta', 'Inconnue', 'Oui', 'Film'],
  'Captain Ginyu': ['Inconnue', 'Inconnue', 'Non', 'Namek'], Zarbon: ['Inconnue', 'Inconnue', 'Oui', 'Namek'], Dodoria: ['Inconnue', 'Inconnue', 'Non', 'Namek'],
  Dabura: ['Royaume des Démons', 'Royaume des Démons', 'Non', 'Boo'], Babidi: ['Inconnue', 'Inconnue', 'Non', 'Boo'],
  Beerus: ['Inconnue', 'Planète de Beerus', 'Non', 'Battle of Gods'], Whis: ['Inconnue', 'Planète de Beerus', 'Non', 'Battle of Gods'],
  Zamasu: ['Royaume des Kaio', 'Royaume des Kaio', 'Non', 'Trunks du futur'], 'Goku Black': ['Royaume des Kaio', 'Terre', 'Oui', 'Trunks du futur'],
  Jiren: ['Inconnue', 'Inconnue', 'Non', "Survie de l'Univers"], Hit: ['Inconnue', 'Inconnue', 'Non', 'Univers 6'],
  Cabba: ['Planète Sadala', 'Planète Sadala', 'Oui', 'Univers 6'], Caulifla: ['Planète Sadala', 'Planète Sadala', 'Oui', "Survie de l'Univers"],
  Kale: ['Planète Sadala', 'Planète Sadala', 'Oui', "Survie de l'Univers"], Toppo: ['Inconnue', 'Inconnue', 'Oui', "Survie de l'Univers"],
  Zeno: ['Inconnue', 'Palais de Zeno', 'Non', 'Univers 6'], Dende: ['Namek', 'Palais du Tout-Puissant', 'Non', 'Namek'],
  'King Kai': ['Royaume des Kaio', 'Planète de Kaio', 'Non', 'Saiyans'], 'Mr. Popo': ['Inconnue', 'Palais du Tout-Puissant', 'Non', 'Piccolo Daimao'],
  Shin: ['Royaume des Kaio', 'Royaume des Kaio', 'Non', 'Boo'], Yajirobe: ['Terre', 'Tour Karin', 'Non', 'Piccolo Daimao'], Korin: ['Terre', 'Tour Karin', 'Non', 'Ruban Rouge'],
  Launch: ['Terre', 'Kame House', 'Oui', 'Pilaf'], Pilaf: ['Terre', 'Château de Pilaf', 'Non', 'Pilaf'], 'Mercenary Tao': ['Terre', 'Inconnue', 'Non', 'Ruban Rouge'],
  'King Piccolo': ['Namek', 'Inconnue', 'Non', 'Piccolo Daimao'],
};
/** Les sagas du wiki, regroupées en arcs. Une saga absente de cette table garde son nom du wiki. */
const SAGAS = {
  'Emperor Pilaf Saga': 'Pilaf', 'Tournament Saga': '21e Tenkaichi Budokai', 'Red Ribbon Army Saga': 'Ruban Rouge', 'General Blue Saga': 'Ruban Rouge',
  'Commander Red Saga': 'Ruban Rouge', 'Fortuneteller Baba Saga': 'Baba la voyante', 'Tien Shinhan Saga': '22e Tenkaichi Budokai', 'King Piccolo Saga': 'Piccolo Daimao',
  'Piccolo Jr. Saga': '23e Tenkaichi Budokai', 'Raditz Saga': 'Saiyans', 'Vegeta Saga': 'Saiyans', 'Namek Saga': 'Namek', 'Captain Ginyu Saga': 'Namek', 'Frieza Saga': 'Namek',
  'Garlic Jr. Saga': 'Garlic Jr.', 'Trunks Saga': 'Cyborgs', 'Androids Saga': 'Cyborgs', 'Imperfect Cell Saga': 'Cell', 'Perfect Cell Saga': 'Cell', 'Cell Games Saga': 'Cell',
  'Other World Saga': "Tournoi de l'Autre Monde", 'Great Saiyaman Saga': 'Boo', 'World Tournament Saga': 'Boo', 'Babidi Saga': 'Boo', 'Majin Buu Saga': 'Boo', 'Fusion Saga': 'Boo',
  'Kid Buu Saga': 'Boo', 'Peaceful World Saga': 'Boo', 'God of Destruction Beerus Saga': 'Battle of Gods', 'Golden Frieza Saga': 'Résurrection de F', 'Universe 6 Saga': 'Univers 6',
  'Copy-Vegeta Saga': 'Univers 6', '"Future" Trunks Saga': 'Trunks du futur', 'Universe Survival Saga': "Survie de l'Univers", 'Galactic Patrol Prisoner Saga': 'Moro',
  'Granolah the Survivor Saga': 'Granolah', 'Super Hero Saga': 'Super Hero', 'Black Star Dragon Ball Saga': 'Dragon Ball GT', 'Baby Saga': 'Dragon Ball GT',
  'Super 17 Saga': 'Dragon Ball GT', 'Shadow Dragon Saga': 'Dragon Ball GT',
};
/** Les lieux de résidence les plus courants, en français. Un lieu absent de cette table garde son nom du wiki. */
const PLACES = { 'Mount Paozu': 'Mont Paozu', 'Kame House': 'Kame House', 'West City': "Capitale de l'Ouest", 'Capsule Corporation': "Capitale de l'Ouest", 'Satan City': 'Satan City',
  'Planet Vegeta': 'Planète Vegeta', 'Namek': 'Namek', 'New Namek': 'Namek', "Kami's Lookout": 'Palais du Tout-Puissant', 'The Lookout': 'Palais du Tout-Puissant',
  'Korin Tower': 'Tour Karin', 'Earth': 'Terre', "Frieza's Spaceship": 'Vaisseau de Freezer', 'Other World': 'Autre Monde', 'Hell': 'Enfer', "Beerus' Planet": 'Planète de Beerus',
  'Sacred World of the Kai': 'Royaume des Kaio', "King Kai's Planet": 'Planète de Kaio', 'Demon Realm': 'Royaume des Démons', 'Planet Sadala': 'Planète Sadala',
  'Red Ribbon Army Headquarters': 'Quartier général du Ruban Rouge', "Zeno's Palace": 'Palais de Zeno', 'Penguin Village': 'Village Pingouin', "Pilaf's Castle": 'Château de Pilaf' };
/** Une forme alternative a toujours sa rubrique sur la fiche du wiki. */
const TRANSFORMS = /\n==+\s*(?:Forms(?: and [Tt]ransformations)?|Transformations?(?: and [Pp]ower-?ups)?|Forms and power-ups)\s*==+/;

/** Quelques races que la première ligne du wiki ne permet pas de ranger. */
const RACES_FIXES = { 'Good Buu': ['Majin'], Beerus: ['Dieu'], Zeno: ['Dieu'], Korin: ['Animal'] };

const unique = values => [...new Set(values)];
const unknown = new Map();
const note = (kind, name) => unknown.set(`${kind} : ${name}`, (unknown.get(`${kind} : ${name}`) ?? 0) + 1);

/** Les éléments d'un champ « [[A]] (note)<br>[[B]] {{former}} ». */
function entries(value) {
  if (!value) return [];
  return value.replace(/<ref[^>]*\/>/g, '').replace(/<ref[^>]*>[\s\S]*?<\/ref>/g, '').split(/<br\s*\/?>/).map(part => part.trim()).filter(Boolean).map(part => ({
    name: (part.match(/\[\[([^|\]]+)/)?.[1] ?? plain(part.replace(/\{\{[^{}]*\}\}/g, ''))).trim(),
    text: plain(part),
    raw: part,
  }));
}

const known = new Map(KNOWN.map(([title, display, aliases]) => [title, { display, aliases }]));
const titles = unique([...KNOWN.map(([title]) => title), ...(await Promise.all(['DB', 'DBZ', 'DBGT', 'DBS'].map(series => dragonBall.category(`Category:${series}_Characters`)))).flat()]);
await dragonBall.pages(titles);

// Le premier arc se lit sur le chapitre (ou, à défaut, l'épisode) de première apparition : sa fiche nomme sa saga
const debutOf = fields => [fields['manga debut'], fields['anime debut']].map(value => value?.match(/\[\[([^|\]#]+)/)?.[1]?.trim()).find(Boolean) ?? null;
const sheets = [];
for (const title of titles) {
  const page = await dragonBall.page(title);
  const fields = page && templateFields(page.wikitext, /\{\{Character Infobox/i);
  if (fields) sheets.push({ title, page, fields, debut: debutOf(fields) });
}
await dragonBall.pages(unique(sheets.map(sheet => sheet.debut).filter(Boolean)));

const slug = slugger();
const roster = [];
for (const { title, page, fields, debut } of sheets) {
  const { display = null, aliases = [] } = known.get(title) ?? {};
  const debutPage = debut ? await dragonBall.page(debut) : null;
  const sagaField = debutPage && (templateFields(debutPage.wikitext, /\{\{(?:Chapter Infobox|Episode ?Infobox)/i)?.saga ?? '');
  const saga = sagaField ? plain(sagaField).split(/[,;]/)[0].trim() : null;
  const firstArc = (saga ? SAGAS[saga] ?? saga.replace(/ Saga$/, '') : fields['movie debut'] ? 'Film' : '') || 'Inconnu';
  const raceText = (entries(fields.race)[0]?.raw ?? '').replace(/\{\{small\|[\s\S]*$/i, '');
  const home = entries(fields.address).find(item => !/former/i.test(item.raw))?.name ?? entries(fields.address)[0]?.name ?? null;
  // À défaut de fiche tenue à la main : l'origine se déduit de la race, la résidence de l'adresse du wiki, la transformation de sa rubrique
  const guessed = [
    /earthling|human/i.test(raceText) ? 'Terre' : /saiyan/i.test(raceText) ? 'Planète Vegeta' : /namekian/i.test(raceText) ? 'Namek' : 'Inconnue',
    home ? PLACES[home] ?? (home.length <= 40 ? home : 'Inconnue') : 'Inconnue',
    TRANSFORMS.test(page.wikitext) ? 'Oui' : 'Non',
    firstArc,
  ];
  const fiche = FICHES[title] ?? guessed;
  roster.push({
    id: slug(display ?? title),
    name: display ?? title, aliases,
    attributes: {
      // La première ligne fait foi : les suivantes décrivent des états passagers (« Female, temporarily, anime only »)
      sexe: /^\s*female/i.test(fields.gender ?? '') ? 'Femme' : /^\s*male/i.test(fields.gender ?? '') ? 'Homme' : 'Autre',
      race: (found => (found.length ? found : ['Autre']))(RACES.filter(([pattern]) => pattern.test(raceText)).map(([, label]) => label)),
      affiliations: unique(entries(fields.allegiance).filter(item => !PASSING.test(item.text)).flatMap(item => {
        const groups = GROUPS.filter(([pattern]) => pattern.test(item.raw)).map(([, label]) => label);
        if (!groups.length) note('affiliation', item.name);
        return groups;
      })).filter(group => !(EXCLUDED[title] ?? []).includes(group)),
      origine: fiche[0], residence: fiche[1], transformation: fiche[2], premiereApparition: fiche[3],
    },
    title: page.title, source: title,
    debug: { race: plain(fields.race ?? '').slice(0, 80), gender: fields.gender, allegiance: entries(fields.allegiance).map(item => item.text).join(' ; ').slice(0, 260) },
  });
}


for (const character of roster) if (RACES_FIXES[character.source]) character.attributes.race = RACES_FIXES[character.source];

if (flag !== '--write') {
  for (const character of flag ? roster.filter(item => item.name.toLowerCase().includes(flag.toLowerCase())) : roster.slice(0, 30)) {
    const a = character.attributes;
    console.log(`${character.name} | ${a.sexe} | ${a.race.join(', ')} | ${a.origine} | ${a.residence} | ${a.affiliations.join(', ')} | ${a.transformation} | ${a.premiereApparition}`);
    console.log('      race:', character.debug.race, '| genre:', character.debug.gender, '\n      all:', character.debug.allegiance);
  }
  console.log(`\n${roster.length} personnages sur ${titles.length} pages du wiki`);
  console.log('arcs :', [...new Set(roster.map(character => character.attributes.premiereApparition))].join(' | '));
  console.log('\nNon traduits (les 30 plus fréquents) :');
  for (const [name, count] of [...unknown].sort((x, y) => y[1] - x[1]).slice(0, 30)) console.log(`  ${count} × ${name}`);
} else {
  writeFileSync(join(cacheDir, 'pages-dragon-ball.json'), JSON.stringify(Object.fromEntries(roster.map(character => [character.id, character.title]))));
  const lines = roster.map(({ id, name, aliases, attributes }) => `  ${JSON.stringify({ id, name, ...(aliases.length ? { aliases } : {}), attributes })},`);
  writeFileSync('src/dossier/data/dragonBall.roster.ts', `// GÉNÉRÉ par scripts/dossier/build-dragonball.mjs à partir de dragonball.fandom.com — ne pas modifier à la main.
// Pour corriger une fiche : ajuster le script (traductions, roster, corrections).
import type { DossierCharacter } from "../types";

export const DRAGON_BALL_ROSTER: DossierCharacter[] = [
${lines.join('\n')}
];
`);
  console.log(`${roster.length} personnages écrits dans src/dossier/data/dragonBall.roster.ts`);
}
