import type { AyanokojiLink, AyanokojiRound, LinkDirection } from "./types";

/**
 * Les douze manches des Liens d'Ayanokoji : D1 à D3, C1 à C3, B1 à B3, A1 à A3.
 *
 * Une épreuve se joue sur les trois manches de la classe choisie.
 *
 * Pour chaque lien, `pairs` liste TOUTES les paires de la manche qui le
 * vérifient, pas seulement celle de la solution : c'est ce qui permet de
 * corriger équitablement (une autre chaîne qui respecte les cinq relations
 * est juste elle aussi) et de vérifier qu'une manche n'a qu'une solution.
 * `npm test` passe les 720 ordres possibles de chaque manche.
 *
 * Sens d'un lien : « = » vaut dans les deux sens ; « > » se lit de gauche à
 * droite (« SENSEI > » : celui de gauche est le sensei de celui de droite).
 */

type Pair = [string, string];

const LIENS: Record<string, string> = {
  "SENSEI >": "Le personnage de gauche est le sensei de celui de droite.",
  "ÉLÈVE >": "Le personnage de gauche est l'élève de celui de droite.",
  "CLAN =": "Les deux personnages sont du même clan.",
  "ENFANT >": "Le personnage de gauche est l'enfant de celui de droite.",
  "PARENT >": "Le personnage de gauche est le parent de celui de droite.",
  "FAMILLE =": "Les deux personnages sont de la même famille.",
  "FRATRIE =": "Les deux personnages sont frères ou sœurs.",
  "COUPLE =": "Les deux personnages forment un couple.",
  "AMI =": "Les deux personnages sont amis.",
  "SERT >": "Le personnage de gauche est au service de celui de droite.",
  "CHEF >": "Le personnage de gauche est le chef de celui de droite.",
  "GARDE =": "Les deux personnages sont gardes du corps ensemble.",
  "GARDE >": "Le personnage de gauche est le garde du corps de celui de droite.",
  "COMBAT =": "Les deux personnages se sont affrontés.",
  "TUE >": "Le personnage de gauche a tué celui de droite.",
  "TUÉ PAR >": "Le personnage de gauche a été tué par celui de droite.",
  "CAPTURE >": "Le personnage de gauche a capturé celui de droite.",
  "CAPTURÉ PAR >": "Le personnage de gauche a été capturé par celui de droite.",
  "ÉQUIPE =": "Les deux personnages ont fait partie de la même équipe.",
  "DUO =": "Les deux personnages forment un duo.",
  "ANBU =": "Les deux personnages ont appartenu à l'ANBU.",
  "ROOT =": "Les deux personnages ont appartenu à la Racine.",
  "JINCHÛRIKI =": "Les deux personnages sont des jinchûriki.",
  "VILLAGE =": "Les deux personnages viennent du même village.",
};

/** Un lien : son libellé (« CLAN = », « SENSEI > ») et toutes les paires de la manche qui le vérifient. */
function lien(index: number, label: string, pairs: Pair[]): AyanokojiLink {
  const direction: LinkDirection = label.endsWith(">") ? "left-to-right" : "both";
  return { id: `l${index + 1}`, label, description: LIENS[label], direction, pairs };
}

/** Toutes les paires possibles dans un groupe : trois membres d'un même clan donnent trois paires. */
const entre = (...ids: string[]): Pair[] => ids.flatMap((a, i) => ids.slice(i + 1).map((b): Pair => [a, b]));

function manche(difficulty: AyanokojiRound["difficulty"], level: AyanokojiRound["level"], noms: Record<string, string>,
  initialOrder: string[], solutionOrder: string[], liens: [string, Pair[]][]): AyanokojiRound {
  return {
    id: `${difficulty}${level}`.toLowerCase(), difficulty, level, title: `Manche ${difficulty}${level}`,
    characters: solutionOrder.map(id => ({ id, name: noms[id] })),
    links: liens.map(([label, pairs], index) => lien(index, label, pairs)),
    initialOrder, solutionOrder,
  };
}

export const AYANOKOJI_ROUNDS: AyanokojiRound[] = [
  // ── Classe D ──
  manche("D", 1, { iruka: "Iruka", naruto: "Naruto", konohamaru: "Konohamaru", asuma: "Asuma", hiruzen: "Hiruzen", jiraiya: "Jiraiya" },
    ["konohamaru", "jiraiya", "iruka", "asuma", "naruto", "hiruzen"],
    ["iruka", "naruto", "konohamaru", "asuma", "hiruzen", "jiraiya"], (() => {
      const sensei: Pair[] = [["iruka", "naruto"], ["iruka", "konohamaru"], ["naruto", "konohamaru"], ["jiraiya", "naruto"], ["hiruzen", "jiraiya"]];
      return [["SENSEI >", sensei], ["SENSEI >", sensei], ["CLAN =", entre("konohamaru", "asuma", "hiruzen")], ["ENFANT >", [["asuma", "hiruzen"]]], ["SENSEI >", sensei]];
    })()),
  manche("D", 2, { haku: "Haku", zabuza: "Zabuza", kakashi: "Kakashi", yamato: "Yamato", sai: "Sai", danzo: "Danzô" },
    ["sai", "haku", "danzo", "zabuza", "yamato", "kakashi"],
    ["haku", "zabuza", "kakashi", "yamato", "sai", "danzo"], (() => {
      // Yamato a servi Danzô au sein de la Racine avant de rejoindre l'ANBU
      const sert: Pair[] = [["haku", "zabuza"], ["sai", "danzo"], ["yamato", "danzo"]];
      return [["SERT >", sert], ["COMBAT =", [["zabuza", "kakashi"], ["haku", "kakashi"]]], ["ANBU =", [["kakashi", "yamato"]]],
        ["ÉQUIPE =", [...entre("kakashi", "yamato", "sai"), ["haku", "zabuza"]]], ["SERT >", sert]];
    })()),
  manche("D", 3, { chiyo: "Chiyo", sasori: "Sasori", sakura: "Sakura", tsunade: "Tsunade", shizune: "Shizune", dan: "Dan" },
    ["dan", "sakura", "sasori", "shizune", "chiyo", "tsunade"],
    ["chiyo", "sasori", "sakura", "tsunade", "shizune", "dan"], (() => {
      const famille: Pair[] = [["chiyo", "sasori"], ["shizune", "dan"]];
      return [["FAMILLE =", famille], ["COMBAT =", [["sasori", "sakura"], ["sasori", "chiyo"]]], ["ÉLÈVE >", [["sakura", "tsunade"], ["shizune", "tsunade"]]],
        ["SENSEI >", [["tsunade", "sakura"], ["tsunade", "shizune"]]], ["FAMILLE =", famille]];
    })()),

  // ── Classe C ──
  manche("C", 1, { omoi: "Omoi", karui: "Karui", killerb: "Killer B", yugito: "Yugito", hidan: "Hidan", kakuzu: "Kakuzu" },
    ["karui", "kakuzu", "yugito", "omoi", "hidan", "killerb"],
    ["omoi", "karui", "killerb", "yugito", "hidan", "kakuzu"], [
      ["ÉQUIPE =", [["omoi", "karui"], ["hidan", "kakuzu"]]],
      ["ÉLÈVE >", [["karui", "killerb"], ["omoi", "killerb"]]],
      ["JINCHÛRIKI =", [["killerb", "yugito"]]],
      ["CAPTURÉ PAR >", [["yugito", "hidan"], ["yugito", "kakuzu"]]],
      ["DUO =", [["hidan", "kakuzu"]]],
    ]),
  manche("C", 2, { anko: "Anko", orochimaru: "Orochimaru", kimimaro: "Kimimaro", jugo: "Jûgo", suigetsu: "Suigetsu", mangetsu: "Mangetsu" },
    ["jugo", "mangetsu", "anko", "kimimaro", "suigetsu", "orochimaru"],
    ["anko", "orochimaru", "kimimaro", "jugo", "suigetsu", "mangetsu"], [
      ["ÉLÈVE >", [["anko", "orochimaru"]]],
      ["CHEF >", [["orochimaru", "kimimaro"], ["orochimaru", "jugo"], ["orochimaru", "suigetsu"], ["orochimaru", "anko"]]],
      ["AMI =", [["kimimaro", "jugo"]]],
      ["ÉQUIPE =", [["jugo", "suigetsu"]]],
      ["FRATRIE =", [["suigetsu", "mangetsu"]]],
    ]),
  manche("C", 3, { baki: "Baki", hayate: "Hayate", yugao: "Yûgao", itachi: "Itachi", kisame: "Kisame", guy: "Guy" },
    ["kisame", "yugao", "baki", "guy", "itachi", "hayate"],
    ["baki", "hayate", "yugao", "itachi", "kisame", "guy"], [
      ["TUE >", [["baki", "hayate"]]],
      ["COUPLE =", [["hayate", "yugao"]]],
      ["ANBU =", [["yugao", "itachi"]]],
      ["DUO =", [["itachi", "kisame"]]],
      ["COMBAT =", [["kisame", "guy"], ["baki", "hayate"]]],
    ]),

  // ── Classe B ──
  manche("B", 1, { hiashi: "Hiashi", hizashi: "Hizashi", neji: "Neji", lee: "Lee", tenten: "Tenten", temari: "Temari" },
    ["tenten", "hizashi", "temari", "lee", "hiashi", "neji"],
    ["hiashi", "hizashi", "neji", "lee", "tenten", "temari"], (() => {
      const equipe = entre("neji", "lee", "tenten");
      return [["FRATRIE =", [["hiashi", "hizashi"]]], ["PARENT >", [["hizashi", "neji"]]], ["ÉQUIPE =", equipe], ["ÉQUIPE =", equipe], ["COMBAT =", [["tenten", "temari"]]]];
    })()),
  manche("B", 2, { mifune: "Mifune", hanzo: "Hanzô", nagato: "Nagato", jiraiya: "Jiraiya", yahiko: "Yahiko", konan: "Konan" },
    ["konan", "nagato", "mifune", "yahiko", "hanzo", "jiraiya"],
    ["mifune", "hanzo", "nagato", "jiraiya", "yahiko", "konan"], [
      ["COMBAT =", [["mifune", "hanzo"], ["hanzo", "jiraiya"], ["hanzo", "nagato"], ["jiraiya", "nagato"], ["jiraiya", "konan"]]],
      ["TUÉ PAR >", [["hanzo", "nagato"], ["jiraiya", "nagato"]]],
      ["ÉLÈVE >", [["nagato", "jiraiya"], ["yahiko", "jiraiya"], ["konan", "jiraiya"]]],
      ["SENSEI >", [["jiraiya", "nagato"], ["jiraiya", "yahiko"], ["jiraiya", "konan"]]],
      ["CHEF >", [["yahiko", "konan"], ["yahiko", "nagato"], ["nagato", "konan"]]],
    ]),
  manche("B", 3, { c: "C", darui: "Darui", a: "A (Raikage)", mabui: "Mabui", samui: "Samui", atsui: "Atsui" },
    ["mabui", "atsui", "darui", "samui", "c", "a"],
    ["c", "darui", "a", "mabui", "samui", "atsui"], [
      ["GARDE =", [["c", "darui"]]],
      ["GARDE >", [["darui", "a"], ["c", "a"]]],
      ["CHEF >", [["a", "mabui"], ["a", "darui"], ["a", "c"], ["a", "samui"], ["a", "atsui"]]],
      // Les six personnages sont tous de Kumo
      ["VILLAGE =", entre("c", "darui", "a", "mabui", "samui", "atsui")],
      ["FRATRIE =", [["samui", "atsui"]]],
    ]),

  // ── Classe A ──
  manche("A", 1, { mu: "Mû", onoki: "Ônoki", deidara: "Deidara", gaara: "Gaara", rasa: "Rasa", orochimaru: "Orochimaru" },
    ["onoki", "rasa", "mu", "gaara", "deidara", "orochimaru"],
    ["mu", "onoki", "deidara", "gaara", "rasa", "orochimaru"], [
      ["SENSEI >", [["mu", "onoki"], ["onoki", "deidara"]]],
      ["VILLAGE =", [...entre("mu", "onoki", "deidara"), ["gaara", "rasa"]]],
      ["CAPTURE >", [["deidara", "gaara"]]],
      ["ENFANT >", [["gaara", "rasa"]]],
      ["TUÉ PAR >", [["rasa", "orochimaru"]]],
    ]),
  manche("A", 2, { tayuya: "Tayuya", shikamaru: "Shikamaru", temari: "Temari", kankuro: "Kankurô", sakon: "Sakon", kiba: "Kiba" },
    ["sakon", "kankuro", "kiba", "temari", "tayuya", "shikamaru"],
    ["tayuya", "shikamaru", "temari", "kankuro", "sakon", "kiba"], (() => {
      const combat: Pair[] = [["tayuya", "shikamaru"], ["tayuya", "temari"], ["shikamaru", "temari"], ["sakon", "kiba"], ["sakon", "kankuro"]];
      return [["COMBAT =", combat], ["COUPLE =", [["shikamaru", "temari"]]], ["FRATRIE =", [["temari", "kankuro"]]],
        ["TUE >", [["kankuro", "sakon"], ["temari", "tayuya"]]], ["COMBAT =", combat]];
    })()),
  manche("A", 3, { shino: "Shino", torune: "Torune", fu: "Fû Yamanaka", sai: "Sai", ino: "Ino", choji: "Chôji" },
    ["fu", "choji", "torune", "ino", "shino", "sai"],
    ["shino", "torune", "fu", "sai", "ino", "choji"], (() => {
      const root = entre("torune", "fu", "sai");
      return [["CLAN =", [["shino", "torune"], ["fu", "ino"]]], ["ROOT =", root], ["ROOT =", root], ["COUPLE =", [["sai", "ino"]]], ["ÉQUIPE =", [["ino", "choji"], ["torune", "fu"]]]];
    })()),
];

export const findRound = (id: string): AyanokojiRound | undefined => AYANOKOJI_ROUNDS.find(round => round.id === id);

/** La manche suivante de l'épreuve : le niveau d'après dans la même classe. Après la troisième, l'épreuve est finie. */
export function nextRound(current: AyanokojiRound): AyanokojiRound | undefined {
  return AYANOKOJI_ROUNDS.find(round => round.difficulty === current.difficulty && round.level === current.level + 1);
}
