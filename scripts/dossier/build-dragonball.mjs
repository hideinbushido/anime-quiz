// Construit src/dossier/data/dragonBall.roster.ts à partir du wiki Dragon Ball (dragonball.fandom.com).
//
//   node scripts/dossier/build-dragonball.mjs <dossier-de-cache> [--write]
//
// Sans --write, le script affiche ce qu'il a lu, pour relecture.
import { writeFileSync } from 'node:fs';
import { wiki, templateFields, plain } from './wiki.mjs';

const [cacheDir, flag] = process.argv.slice(2);
if (!cacheDir) throw new Error('Usage : node scripts/dossier/build-dragonball.mjs <dossier-de-cache> [--write]');
const dragonBall = wiki('dragonball', cacheDir);

/** Le roster : le titre de la page du wiki, puis le nom affiché et les surnoms si besoin. */
const ROSTER = [
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
const RACES = [[/saiyan/i, 'Saiyan'], [/earthling|human/i, 'Terrien'], [/namekian/i, 'Namek'], [/frieza/i, 'Race de Freezer'],
  [/android|cyborg/i, 'Cyborg'], [/majin/i, 'Majin'], [/angel/i, 'Ange'], [/glind|shinjin|core person/i, 'Kaioshin'], [/demon realm/i, 'Démon']];
const SERIES = [['DB_Characters', 'Dragon Ball'], ['DBZ_Characters', 'Dragon Ball Z'], ['DBGT_Characters', 'Dragon Ball GT'], ['DBS_Characters', 'Dragon Ball Super']];
/** Les groupes retenus. Le wiki mêle le manga, les films et les jeux : on ne garde que ceux-ci. */
const GROUPS = [[/Dragon Team/, 'Équipe Dragon'], [/Ginyu Force/, 'Commando Ginyu'], [/Frieza Force/, 'Armée de Freezer'], [/Saiyan Army/, 'Armée Saiyan'],
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
  Goku: ['Armée de Freezer', 'Armée Saiyan'], Uub: ['Armée de Freezer'], Raditz: ['Équipe Dragon'], Nappa: ['Équipe Dragon'],
  Dabura: ['Équipe Dragon'], Pilaf: ['Armée de Freezer', 'Clan démoniaque de Piccolo', 'Équipe Dragon'], 'Dr. Gero': ['Bande de Pilaf'],
  'Android 16': ['Capsule Corp.'],
};
const UNIVERSES = { Hit: '6', Cabba: '6', Caulifla: '6', Kale: '6', Jiren: '11', Toppo: '11', Zamasu: '10', 'Goku Black': '10', Zeno: 'Aucun' };

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

const roster = [];
for (const [title, display, aliases] of ROSTER) {
  const page = await dragonBall.page(title);
  const fields = page && templateFields(page.wikitext, /\{\{Character Infobox/i);
  if (!fields) { console.log(page ? 'SANS FICHE' : 'ABSENT', title); continue; }
  const cats = page.categories;
  const series = SERIES.filter(([key]) => cats.includes(key)).map(([, label]) => label);
  roster.push({
    id: (display ?? title).normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''),
    name: display ?? title, aliases,
    attributes: {
      // La première ligne fait foi : les suivantes décrivent des états passagers (« Female, temporarily, anime only »)
      sexe: /^\s*female/i.test(fields.gender ?? '') ? 'Femme' : /^\s*male/i.test(fields.gender ?? '') ? 'Homme' : null,
      race: (found => (found.length ? found : ['Autre']))(RACES.filter(([pattern]) => pattern.test((entries(fields.race)[0]?.raw ?? '').replace(/\{\{small\|[\s\S]*$/i, ''))).map(([, label]) => label)),
      affiliations: unique(entries(fields.allegiance).filter(item => !PASSING.test(item.text)).flatMap(item => {
        const groups = GROUPS.filter(([pattern]) => pattern.test(item.raw)).map(([, label]) => label);
        if (!groups.length) note('affiliation', item.name);
        return groups;
      })).filter(group => !(EXCLUDED[title] ?? []).includes(group)),
      univers: UNIVERSES[title] ?? '7',
      series,
      premiereSerie: series[0] ?? null,
    },
    // Le wiki décrit Boo comme un Majin issu d'un Kaioshin absorbé : pour le jeu, c'est un Majin
    ...(title === 'Good Buu' ? { fix: true } : {}),
    debug: { race: plain(fields.race ?? '').slice(0, 80), gender: fields.gender, allegiance: entries(fields.allegiance).map(item => item.text).join(' ; ').slice(0, 260) },
  });
}

for (const character of roster) if (character.fix) character.attributes.race = ['Majin'];

if (flag !== '--write') {
  for (const character of roster) {
    const a = character.attributes;
    console.log(`${character.name} | ${a.sexe} | ${a.race.join(', ')} | ${a.affiliations.join(', ')} | U${a.univers} | ${a.series.join(', ')} | ${a.premiereSerie}`);
    console.log('      race:', character.debug.race, '| genre:', character.debug.gender, '\n      all:', character.debug.allegiance);
  }
  console.log('\nNon traduits :');
  for (const [name, count] of [...unknown].sort((x, y) => y[1] - x[1])) console.log(`  ${count} × ${name}`);
} else {
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
