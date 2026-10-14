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
    principe: "Un extrait musical démarre. Le premier qui reconnaît l'anime buzze sur son téléphone et donne son nom.",
    etapes: [
      "Le présentateur lance le morceau. Il y en a sept, du plus évident au plus retors.",
      "Le premier buzz coupe la musique et donne la main. La réponse se donne à voix haute.",
      "Le présentateur tranche : vrai ou faux. Lui seul décide.",
      "Chaque joueur a deux tentatives par morceau. Après une erreur, son buzzer est bloqué pendant sept secondes.",
      "Deux erreurs chacun : personne ne marque, et la réponse est révélée.",
    ],
    bareme: "Plus le morceau est tardif et la classe élevée, plus il rapporte. Une erreur ne retire jamais de points.",
  },
  "liens-ayanokoji": {
    principe: "Six personnages, cinq liens : chacun, sur son écran, remet la chaîne dans l'ordre où chaque voisin respecte la relation indiquée.",
    etapes: [
      "Les deux joueurs reçoivent les mêmes six cartes, dans le même désordre.",
      "Entre deux places voisines, un lien décrit la relation attendue : maître et élève, coéquipiers, même village.",
      "Chacun échange ses cartes deux à deux, sans voir le plateau de l'autre, puis valide.",
      "Quand les deux ont validé, le présentateur révèle : la chaîne est corrigée lien par lien.",
      "L'épreuve se joue en trois manches de la classe choisie.",
    ],
    bareme: "Chaque lien juste rapporte des points, la chaîne parfaite double la mise. Plus la classe est haute, plus un lien vaut cher.",
  },
  "citations-cultes": {
    principe: "Une réplique s'affiche. Le premier qui retrouve le personnage qui l'a prononcée buzze et donne son nom.",
    etapes: [
      "Le présentateur lit la réplique, puis ouvre le buzzer.",
      "Le premier buzz donne la main. La réponse se donne à voix haute.",
      "Le présentateur tranche : vrai ou faux.",
      "Chaque joueur a deux tentatives par réplique. Après une erreur, son buzzer est bloqué pendant sept secondes.",
    ],
    bareme: "100 points par bonne réponse. Une erreur ne retire rien.",
  },
  "pensees-anya": {
    principe: "Une question de sondage, huit réponses cachées. Il faut retrouver ce que les gens ont le plus répondu.",
    etapes: [
      "Pas de buzzer : celui qui a une idée la dit à voix haute, et le présentateur lui donne la main.",
      "Bonne réponse : elle s'affiche au tableau avec la photo de celui qui l'a trouvée. Sa valeur reste cachée.",
      "Mauvaise réponse : un strike. À trois strikes, le joueur est hors manche ; l'autre continue seul.",
      "À la fin de la manche, le présentateur révèle les points de chaque réponse, un par un.",
      "L'épreuve se joue en trois manches. Les strikes repartent de zéro à chaque manche.",
    ],
    bareme: "Chaque réponse vaut le nombre de fois où elle a été citée. Personne ne connaît ces valeurs avant la révélation.",
  },
  "dossier-l": {
    principe: "Un personnage mystère, le même pour les deux joueurs. Proposition après proposition, les indices le dessinent.",
    etapes: [
      "Chacun propose un personnage sur son écran. La proposition est verrouillée, sans rien révéler.",
      "Quand les deux ont validé, les deux lignes apparaissent ensemble : une case par caractéristique.",
      "Vert : ça correspond. Orange : en partie. Rouge : rien en commun.",
      "Le premier qui propose le bon personnage gagne le round. Les deux au même tour : égalité.",
      "Cinq rounds : deux sur Naruto, deux sur One Piece, un sur Dragon Ball.",
    ],
    bareme: "Un point par round gagné.",
  },
};
