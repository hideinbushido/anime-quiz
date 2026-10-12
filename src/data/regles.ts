/**
 * Les règles de chaque épreuve, telles que le jeu les applique.
 * Ce texte nourrit la page des règles ; il est écrit pour être dit à voix haute,
 * et peut servir tel quel de script à une présentation avant l'épreuve.
 * À compléter à chaque nouvelle épreuve, sous son identifiant.
 */
export interface RegleEpreuve {
  /** Une phrase : ce qu'il faut faire. */
  principe: string;
  /** Le déroulé, dans l'ordre. */
  etapes: string[];
  /** Comment les points sont comptés. */
  bareme: string;
}

export const REGLES: Record<string, RegleEpreuve> = {
  "blind-test-openings": {
    principe: "Un extrait musical démarre. Le premier qui reconnaît l'anime buzze et donne son nom.",
    etapes: [
      "Le présentateur lance le morceau. Il y en a cinq, du plus évident au plus retors.",
      "Le premier buzz coupe la musique et donne la main. La réponse se donne à voix haute.",
      "Le présentateur tranche : vrai ou faux. Lui seul décide.",
      "Chaque joueur a deux tentatives par morceau. Après une erreur, il attend que l'adversaire ait tenté sa chance.",
      "Deux erreurs chacun : personne ne marque, et la réponse est révélée.",
    ],
    bareme: "Plus le morceau est tardif et la classe élevée, plus il rapporte. Une erreur ne retire jamais de points.",
  },
  "liens-ayanokoji": {
    principe: "Six places, une seule chaîne parfaite : chaque personnage doit être relié à son voisin par la relation indiquée.",
    etapes: [
      "Les cartes des personnages sont posées devant le joueur. Selon la classe, certaines sont des leurres.",
      "Entre deux places voisines, un lien décrit la relation attendue : maître et élève, successeur, coéquipier.",
      "Le joueur place ses cartes dans l'ordre qu'il veut, les déplace, les échange.",
      "Quand les six places sont remplies, il valide : la chaîne est corrigée case par case.",
    ],
    bareme: "100 points par personnage à la bonne place, soit 600 points pour une chaîne parfaite.",
  },
  "citations-cultes": {
    principe: "Une réplique s'affiche. Il faut retrouver le personnage qui l'a prononcée.",
    etapes: [
      "Cinq répliques se suivent.",
      "Avant chaque réponse, le présentateur désigne le joueur qui répond.",
      "La réponse est saisie puis validée. Une seule chance par réplique.",
    ],
    bareme: "100 points par bonne réponse. Une mauvaise réponse ne retire rien.",
  },
};
