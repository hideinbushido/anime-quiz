// Construit src/dossier/data/onePiece.roster.ts à partir du wiki One Piece (onepiece.fandom.com).
//
//   node scripts/dossier/build-onepiece.mjs <dossier-de-cache> [--write]
//
// Sans --write, le script affiche ce qu'il a lu, pour relecture.
import { writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { wiki, templateFields, plain, slugger } from './wiki.mjs';

const [cacheDir, flag] = process.argv.slice(2);
if (!cacheDir) throw new Error('Usage : node scripts/dossier/build-onepiece.mjs <dossier-de-cache> [--write]');
const onePiece = wiki('onepiece', cacheDir);

/**
 * Le roster est complet : tous les personnages du wiki qui apparaissent dans le manga.
 * Cette liste ne sert qu'à donner un nom d'affichage ou des surnoms aux plus connus.
 */
const KNOWN = [
  ['Monkey D. Luffy', null, ['Luffy', 'Chapeau de Paille']], ['Roronoa Zoro', null, ['Zoro', 'Zorro']], ['Nami', null, []], ['Usopp', null, ['Pipo', 'Sogeking']],
  ['Sanji', null, ['Vinsmoke Sanji', 'Sandy']], ['Tony Tony Chopper', null, ['Chopper']], ['Nico Robin', null, ['Robin']], ['Franky', null, ['Cutty Flam']],
  ['Brook', null, []], ['Jinbe', null, ['Jimbei', 'Jinbei']],
  ['Shanks', null, ['Shanks le Roux']], ['Buggy', null, ['Baggy', 'Buggy le Clown']], ['Dracule Mihawk', null, ['Mihawk', 'Œil de Faucon']],
  ['Crocodile', null, ['Mr. 0']], ['Donquixote Doflamingo', null, ['Doflamingo', 'Don Quijote Doflamingo']], ['Boa Hancock', null, ['Hancock']],
  ['Bartholomew Kuma', null, ['Kuma']], ['Gecko Moria', null, ['Moria']], ['Marshall D. Teach', null, ['Barbe Noire', 'Teach']],
  ['Edward Newgate', null, ['Barbe Blanche']], ['Portgas D. Ace', null, ['Ace']], ['Marco', null, ['Marco le Phénix']], ['Sabo', null, []],
  ['Monkey D. Dragon', null, ['Dragon']], ['Monkey D. Garp', null, ['Garp']], ['Sengoku', null, []], ['Sakazuki', null, ['Akainu']],
  ['Borsalino', null, ['Kizaru']], ['Kuzan', null, ['Aokiji']], ['Issho', null, ['Fujitora']], ['Smoker', null, []], ['Tashigi', null, []], ['Koby', null, ['Kobby']],
  ['Trafalgar D. Water Law', 'Trafalgar Law', ['Law', 'Trafalgar D. Water Law']], ['Eustass Kid', null, ['Kid']], ['Killer', null, []],
  ['Bartolomeo', null, []], ['Cavendish', null, []], ['Jewelry Bonney', null, ['Bonney']], ['Basil Hawkins', null, ['Hawkins']], ['X Drake', null, ['Drake']],
  ['Kaidou', 'Kaido', ['Kaidou']], ['Charlotte Linlin', null, ['Big Mom']], ['Charlotte Katakuri', null, ['Katakuri', 'Dent-de-chien']],
  ['King', null, ['Alber']], ['Queen', null, []], ['Yamato', null, []], ['Kozuki Oden', null, ['Oden']],
  ['Gol D. Roger', null, ['Roger', 'Gold Roger']], ['Silvers Rayleigh', null, ['Rayleigh']],
  ['Rob Lucci', null, ['Lucci']], ['Kaku', null, []], ['Enel', null, ['Ener']], ['Arlong', null, []], ['Kuro', null, ['Capitaine Kuro', 'Klahadoll']], ['Don Krieg', null, ['Krieg']],
  ['Nefertari Vivi', null, ['Vivi']], ['Carrot', null, []], ['Perona', null, []], ['Emporio Ivankov', null, ['Ivankov', 'Iva']], ['Magellan', null, []],
  ['Bentham', 'Bon Clay', ['Mr. 2', 'Bentham', 'Bon Kurei']], ['Vinsmoke Reiju', null, ['Reiju']], ['Bellamy', null, []], ['Caesar Clown', null, ['Caesar', 'César Clown']], ['Vegapunk', null, ['Dr. Vegapunk']],
];

const AFFILIATIONS = {
  'Straw Hat Pirates': 'Équipage du Chapeau de Paille', 'Straw Hat Grand Fleet': 'Grande Flotte du Chapeau de Paille', Marines: 'Marine', 'World Government': 'Gouvernement Mondial',
  'Seven Warlords of the Sea': 'Sept Grands Corsaires', 'Four Emperors': 'Quatre Empereurs', 'Revolutionary Army': 'Armée Révolutionnaire', 'Baroque Works': 'Baroque Works',
  'Beasts Pirates': 'Équipage aux Cent Bêtes', 'Big Mom Pirates': 'Équipage de Big Mom', 'Whitebeard Pirates': 'Équipage de Barbe Blanche', 'Blackbeard Pirates': 'Équipage de Barbe Noire',
  'Roger Pirates': 'Équipage de Roger', 'Red Hair Pirates': 'Équipage du Roux', 'Heart Pirates': 'Équipage du Heart', 'Kid Pirates': 'Équipage de Kid', 'Cross Guild': 'Cross Guild',
  CP9: 'CP9', CP0: 'CP0', 'Donquixote Pirates': 'Équipage de Don Quijote', 'Impel Down': 'Impel Down', 'Kuja Pirates': 'Pirates Kuja', 'Sun Pirates': 'Pirates du Soleil',
  'Arlong Pirates': "Équipage d'Arlong", 'Buggy Pirates': 'Équipage de Buggy', 'Black Cat Pirates': 'Équipage du Chat Noir', 'Krieg Pirates': 'Équipage de Krieg',
  'Thriller Bark Pirates': 'Équipage de Thriller Bark', 'Ninja-Pirate-Mink-Samurai Alliance': 'Alliance de Wano', 'Germa Kingdom': 'Royaume de Germa',
  'Germa 66': 'Germa 66', 'Vinsmoke Family': 'Famille Vinsmoke', 'Charlotte Family': 'Famille Charlotte', 'Donquixote Family': 'Famille Don Quijote', 'Kozuki Family': 'Famille Kozuki',
  'Spade Pirates': 'Équipage du Spade', 'Rocks Pirates': 'Équipage de Rocks', 'Barto Club': 'Barto Club', 'Beautiful Pirates': 'Beautiful Pirates', 'Bonney Pirates': 'Équipage de Bonney',
  'Hawkins Pirates': 'Équipage de Hawkins', 'Drake Pirates': 'Équipage de Drake', 'Bellamy Pirates': 'Équipage de Bellamy', 'Galley-La Company': 'Galley-La Company',
  'Franky Family': 'Franky Family', 'Baratie': 'Baratie', 'Arabasta Kingdom': "Royaume d'Alabasta", 'Nefertari Family': 'Famille Nefertari', 'Mokomo Dukedom': 'Duché de Mokomo',
  'SSG': 'SSG', 'SWORD': 'SWORD', 'Skypiea': 'Skypiea', 'God\'s Army': "Armée du Dieu", 'Kamabakka Kingdom': 'Royaume de Kamabakka', 'Rumbar Pirates': 'Équipage du Rumbar',
  'Wano Country': 'Pays des Wa', 'Nine Red Scabbards': 'Neuf Fourreaux Rouges', 'Ohara': 'Ohara', 'MADS': 'MADS', 'Punk Hazard': 'Punk Hazard', 'Usopp Pirates': "Équipage d'Usopp",
  'Cipher Pol': 'Cipher Pol', 'Dadan Family': 'Famille Dadan', 'Ryugu Kingdom': 'Royaume Ryugu', 'World Noble': 'Dragons Célestes', 'G-5': 'G-5',
  'Knights of God': 'Chevaliers Divins', 'Foxy Pirates': 'Équipage de Foxy', 'Goa Kingdom': 'Royaume de Goa', 'Lunarian': 'Lunaria', 'Shimotsuki Family': 'Famille Shimotsuki', 'Monkey Family': 'Famille Monkey', 'Kuja': 'Kuja', 'Amazon Lily': 'Amazon Lily',
};
const ORIGINS = { 'East Blue': 'East Blue', 'West Blue': 'West Blue', 'North Blue': 'North Blue', 'South Blue': 'South Blue', 'Grand Line': 'Grand Line',
  'Paradise': 'Grand Line', 'New World': 'Nouveau Monde', 'Red Line': 'Red Line', 'Sky Island': 'Île Céleste', 'Calm Belt': 'Calm Belt' };
const SPECIES = { Humans: 'Humain', Modified_Humans: 'Humain', Talking_Animals: 'Animal', Mink_Tribe: 'Mink', 'Fish-Men': 'Homme-Poisson', Merfolk: 'Sirène', Giants: 'Géant', Minks: 'Mink', Cyborgs: 'Cyborg', Lunarians: 'Lunaria',
  Skypieans: 'Céleste', Birkans: 'Céleste', Shandia: 'Céleste', Longarm_Tribe: 'Longs-Bras', Longleg_Tribe: 'Longues-Jambes', Oni: 'Oni', Animals: 'Animal', Buccaneers: 'Boucanier', Zombies: 'Zombie' };
const HAKI = { Observation_Haki_Users: 'Observation', Armament_Haki_Users: 'Armement', Supreme_King_Haki_Users: 'Rois' };
/** Les types de fruit, du plus précis au plus général : « Mythical Zoan » ne doit pas être lu comme un simple « Zoan ». */
const FRUITS = [[/mythical zoan/i, 'Zoan mythique'], [/ancient zoan/i, 'Zoan antique'], [/zoan/i, 'Zoan'], [/logia/i, 'Logia'], [/paramecia/i, 'Paramecia']];
/** Les arcs du manga, par chapitre de début. */
const ARCS = [[1, 'Romance Dawn'], [8, 'Orange Town'], [22, 'Village de Sirop'], [42, 'Baratie'], [69, 'Arlong Park'], [96, 'Loguetown'],
  [101, 'Reverse Mountain'], [106, 'Whisky Peak'], [115, 'Little Garden'], [130, 'Île de Drum'], [155, 'Alabasta'], [218, 'Jaya'], [237, 'Skypiea'],
  [303, 'Long Ring Long Land'], [322, 'Water Seven'], [375, 'Enies Lobby'], [431, 'Post-Enies Lobby'], [442, 'Thriller Bark'], [490, 'Archipel Sabaody'],
  [514, 'Amazon Lily'], [525, 'Impel Down'], [550, 'Marineford'], [581, 'Post-Guerre'], [598, 'Retour à Sabaody'], [603, 'Île des Hommes-Poissons'],
  [654, 'Punk Hazard'], [700, 'Dressrosa'], [802, 'Zou'], [825, 'Whole Cake Island'], [903, 'Rêverie'], [909, 'Pays des Wa'], [1058, 'Egghead']];

/**
 * Ce que le wiki ne tranche pas pour nous, corrigé à la main : il ne range ni
 * Ivankov ni Bon Clay parmi les hommes ou les femmes.
 */
const CORRECTIONS = { 'Emporio Ivankov': { sexe: 'Homme' }, Bentham: { sexe: 'Homme' } };
const unique = values => [...new Set(values)];
const unknown = new Map();
const note = (kind, name) => unknown.set(`${kind} : ${name}`, (unknown.get(`${kind} : ${name}`) ?? 0) + 1);

/** Les éléments d'un champ « A;<br />B (former);{{Qref…}} C » : chaque lien, avec ce qui le suit. */
function entries(value) {
  if (!value) return [];
  const clean = value.replace(/<ref[^>]*\/>/g, '').replace(/<ref[^>]*>[\s\S]*?<\/ref>/g, '').replace(/\{\{Qref(?:[^{}]|\{\{[^{}]*\}\})*\}\}/gi, '');
  return clean.split(/;|<br\s*\/?>/).map(part => part.trim()).filter(Boolean).map(part => ({
    name: (part.match(/\[\[([^|\]]+)/)?.[1] ?? plain(part)).trim(),
    noncanon: /noncanon|non-canon/i.test(part),
    text: plain(part.replace(/\{\{[^{}]*\}\}/g, '')),
  }));
}

const roster = [];
const known = new Map(KNOWN.map(([title, display, aliases]) => [title, { display, aliases }]));
const titles = unique([...KNOWN.map(([title]) => title), ...await onePiece.category('Category:Male_Characters'), ...await onePiece.category('Category:Female_Characters')]);
await onePiece.pages(titles);
// Les personnages principaux ont leur fiche dans un gabarit d'onglets, les autres dans la page
const tabbed = [];
for (const title of titles) {
  const page = await onePiece.page(title);
  if (page && !templateFields(page.wikitext, /\{\{Char Box/i)) tabbed.push(`Template:${page.title} Tabs Top`);
}
await onePiece.pages(tabbed);

const slug = slugger();
for (const title of titles) {
  const { display = null, aliases = [] } = known.get(title) ?? {};
  const page = await onePiece.page(title);
  if (!page) continue;
  let fields = templateFields(page.wikitext, /\{\{Char Box/i);
  if (!fields) {
    const tabs = await onePiece.page(`Template:${page.title} Tabs Top`);
    fields = tabs && templateFields(tabs.wikitext, /\{\{Char Box/i);
  }
  // Seuls comptent les personnages du manga : il faut une fiche, et un chapitre de première apparition
  if (!fields || !/Chapter \d+/.test(fields.first ?? '')) continue;
  const cats = page.categories;

  // Un passage éclair (cuisinier d'un jour au Baratie) ou une cellule à Impel Down ne font pas une affiliation
  const passing = item => /temporar/i.test(item.text) || (item.name === 'Impel Down' && /former/i.test(item.text));
  const affiliations = unique(entries(fields.affiliation).filter(item => !item.noncanon && !passing(item)).flatMap(item => {
    if (AFFILIATIONS[item.name]) return [AFFILIATIONS[item.name]];
    note('affiliation', item.name);
    // Un groupe que nous n'avons pas traduit garde son nom du wiki, plutôt que de disparaître
    return /#|Will of D\.|^his |^her /i.test(item.name) || item.name.length > 40 ? [] : [item.name];
  }));
  // Une seule affiliation à l'écran : la principale, celle que le wiki donne en premier (l'équipage actuel,
  // la famille, ou l'organisation). Tout lister donnait des cases illisibles : Luffy en avait cinq.
  // Les regroupements qui ne sont ni un équipage ni une famille ne comptent pas.
  const META = ['Alliance de Wano', 'Quatre Empereurs', 'Sept Grands Corsaires', 'Grande Flotte du Chapeau de Paille'];
  let principal = affiliations.find(name => !META.includes(name));
  // Les enfants de Big Mom naviguent sous son pavillon : même case que le reste de l'équipage
  if (principal === 'Famille Charlotte' && affiliations.includes('Équipage de Big Mom')) principal = 'Équipage de Big Mom';
  // Corrections à la main : le wiki liste d'abord le groupe de jeunesse de Kuma, pas l'armée où on le connaît
  if (page.title === 'Bartholomew Kuma') principal = 'Armée Révolutionnaire';
  principal = { 'Kouzuki Family': 'Famille Kozuki', 'Kurozumi Family': 'Famille Kurozumi' }[principal] ?? principal;
  affiliations.splice(0, affiliations.length, ...(principal ? [principal] : []));
  // L'origine n'est connue que pour une partie des personnages : les autres sont « Inconnue », jamais vides
  const originName = entries(fields.origin)[0]?.name ?? null;
  const origin = !originName || /[{}|]/.test(originName) ? 'Inconnue' : ORIGINS[originName] ?? (note('origine', originName), originName);
  const found = unique(Object.keys(SPECIES).filter(key => cats.includes(key)).map(key => SPECIES[key]));
  const species = found.length ? found : ['Humain'];
  const chapter = Number(fields.first?.match(/Chapter (\d+)/)?.[1]);
  // Tous les types cités comptent, l'ancien comme le nouveau : Luffy est « Paramecia » puis « Zoan mythique »,
  // et Barbe Noire porte deux fruits. Un type général déjà couvert par sa forme précise (Zoan / Zoan mythique) n'est pas répété.
  const fruitText = [fields.dftype, fields.dftype2, fields.dftype3].filter(Boolean).map(value => plain(value)).join(' ; ');
  let fruit = [], rest = fruitText;
  for (const [pattern, label] of FRUITS) if (pattern.test(rest)) { fruit.push(label); rest = rest.replace(new RegExp(pattern.source, 'gi'), ''); }
  fruit = ['Paramecia', 'Zoan', 'Zoan antique', 'Zoan mythique', 'Logia'].filter(label => fruit.includes(label));

  roster.push({
    id: slug(display ?? title), title: page.title,
    name: display ?? title, aliases,
    attributes: {
      sexe: cats.includes('Female_Characters') ? 'Femme' : cats.includes('Male_Characters') ? 'Homme' : 'Autre',
      espece: species, affiliations, origine: origin, fruit,
      haki: Object.keys(HAKI).filter(key => cats.includes(key)).map(key => HAKI[key]),
      premiereApparition: chapter ? [...ARCS].reverse().find(([from]) => chapter >= from)[1] : null,
    },
    debug: { chapter, dftype: plain(fields.dftype ?? ''), dfname: plain(fields.dfname ?? '').slice(0, 40), },
  });
  Object.assign(roster.at(-1).attributes, CORRECTIONS[title] ?? {});
}

if (flag !== '--write') {
  for (const character of flag ? roster.filter(item => item.name.toLowerCase().includes(flag.toLowerCase())) : roster.slice(0, 30)) {
    const a = character.attributes;
    console.log(`${character.name} | ${a.sexe} | ${a.espece.join(', ')} | ${a.affiliations.join(', ')} | ${a.origine} | ${a.fruit.join(', ')} | ${a.haki.join(', ')} | ${a.premiereApparition} (ch.${character.debug.chapter})`);
  }
  console.log(`\n${roster.length} personnages sur ${titles.length} pages du wiki`);
  console.log('\nNon traduits (les 40 plus fréquents) :');
  for (const [name, count] of [...unknown].sort((x, y) => y[1] - x[1]).slice(0, 40)) console.log(`  ${count} × ${name}`);
} else {
  writeFileSync(join(cacheDir, 'pages-one-piece.json'), JSON.stringify(Object.fromEntries(roster.map(character => [character.id, character.title]))));
  const lines = roster.map(({ id, name, aliases, attributes }) => `  ${JSON.stringify({ id, name, ...(aliases.length ? { aliases } : {}), attributes })},`);
  writeFileSync('src/dossier/data/onePiece.roster.ts', `// GÉNÉRÉ par scripts/dossier/build-onepiece.mjs à partir de onepiece.fandom.com — ne pas modifier à la main.
// Pour corriger une fiche : ajuster le script (traductions, roster, corrections).
import type { DossierCharacter } from "../types";

export const ONE_PIECE_ROSTER: DossierCharacter[] = [
${lines.join('\n')}
];
`);
  console.log(`${roster.length} personnages écrits dans src/dossier/data/onePiece.roster.ts`);
}
