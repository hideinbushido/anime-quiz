import type { FeudRound } from "./types";

/**
 * LES PENSÉES D'ANYA — les trois manches.
 *
 * Pour changer une manche : modifier ici la question, les huit réponses et
 * leurs valeurs. Rien d'autre n'est à toucher. Les réponses sont rangées de
 * la plus citée à la moins citée ; les noms supplémentaires d'une réponse
 * servent seulement à aider le présentateur à trancher.
 *
 * ⚠ Les valeurs sont PROVISOIRES : le sondage n'a pas encore été chiffré.
 * Elles suivent une répartition type (total 100) en attendant les vrais nombres.
 */
export const FEUD_TITLE = "Les Pensées d'Anya";

const PROVISOIRE = [27, 21, 16, 13, 9, 7, 4, 3];

type Reponse = string | [label: string, ...aliases: string[]];

const manche = (roundNumber: 1 | 2 | 3, question: string, answers: Reponse[], points: number[] = PROVISOIRE): FeudRound => ({
  id: `anya-${roundNumber}`, roundNumber, question,
  answers: answers.map((answer, index) => {
    const [label, ...aliases] = typeof answer === "string" ? [answer] : answer;
    return { id: `anya-${roundNumber}-${index + 1}`, label, points: points[index], ...(aliases.length ? { aliases } : {}) };
  }),
});

export const FEUD_ROUNDS: FeudRound[] = [
  manche(1, "Quel personnage est beaucoup trop fort pour son propre anime ?", [
    ["Gojo", "Satoru Gojo"], "Saitama", "Escanor", ["Levi", "Livaï"], ["Madara", "Madara Uchiha"],
    ["Mash", "Mash Burnedead"], ["Mob", "Shigeo Kageyama"], ["Aizen", "Sosuke Aizen"],
  ]),
  manche(2, "Quel personnage aurait le plus de succès sur Tinder ?", [
    ["Gojo", "Satoru Gojo"], ["Levi", "Livaï"], ["Dazai", "Osamu Dazai"], ["Hawks", "Hawk", "Keigo Takami"],
    ["Loid", "Loid Forger", "Twilight"], ["Toji", "Toji Fushiguro"], ["Sanji", "Vinsmoke Sanji"], ["Nanami", "Kento Nanami"],
  ]),
  manche(3, "Quel personnage a le plus d'aura sans avoir besoin de parler ?", [
    ["Itachi", "Itachi Uchiha"], "Piccolo", ["Shanks", "Shanks le Roux"], ["Aizen", "Sosuke Aizen"],
    ["Madara", "Madara Uchiha"], ["Toji", "Toji Fushiguro"], ["Mihawk", "Dracule Mihawk", "Œil de Faucon"], ["Zoro", "Roronoa Zoro"],
  ]),
];
