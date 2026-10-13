# Quiz'Animanga, le site du présentateur

Self-authored under explicit creative delegation.

Ce n'est pas une page neuve : scroll-craft est appliqué au site existant (Vite + React), sans toucher à son design or ni à sa structure. Le moteur `engine/scrollcraft.js` n'est pas embarqué ; l'interaction est codée dans le site (`src/fx/pointer.ts`, `src/components/fx/StageFx.tsx`, `src/design/fx.css`).

## Ce que l'utilisateur a dit (mot pour mot)

- « je veux juste que tu fasses le site en scroll craft »
- « qu'on puisse interagir avec tout ce qu'on voit »
- « ya pas forcement de defilement mais faut que ce soit interactif et l'animation soit du genre scroll craft »
- « tout en respectant le design deja du site »

## Les huit sujets (décisions d'auteur, sauf mention)

1. Ambiance : plateau télé, or sur noir, duel, tendu, joueur. Références : un générique d'anime, un écran « VS » de jeu de combat, un jeu télévisé.
2. Parcours : l'arène (les deux pseudos) → le choix des épreuves (2 + 2 + 1) → la régie de chaque épreuve → le bilan. C'est le parcours existant, inchangé.
3. Énergie : calme à l'accueil tant que les pseudos manquent, monte quand l'arène s'arme, retombe dans la régie (outil de travail), culmine au bilan.
4. Ressenti et sommet : voir plus bas.
5. Ce que ce site fait et pas un autre : le trait d'or qui sépare les deux camps se pousse à la main.
6. Écart au premium sobre : joueur, maximaliste mesuré. Le design or existant fait foi (dit par l'utilisateur).
7. Monde continu ou scènes : scènes distinctes, une par écran du site. Pas de défilement imposé (dit par l'utilisateur).
8. Matière existante : logos des épreuves, sceau Zenkai, portraits, vidéo des règles de Killer Bee. Rien n'est généré.

## Grammaire

Surface vivante (2.3) : le site est l'outil du présentateur, pas une page marketing. Écart assumé : l'accueil garde son grand titre, parce que le design existant est une contrainte de l'utilisateur. Les sept autres grammaires supposent une page que l'on fait défiler, ce que la demande écarte.

## Courbe de ressenti

- Accueil : curiosité. Le fond bouge sous la main, le trait d'or suit le pointeur, le sceau se laisse attraper.
- Arène armée : tension. Les deux camps s'allument, le sceau accélère, le bouton attire le pointeur.
- Choix des épreuves : appétit. Chaque tuile s'incline et prend la lumière là où on la touche.
- Régie : maîtrise. Peu de mouvement : c'est un outil, il ne doit pas distraire.
- Bilan : triomphe. Pluie de confettis, sceau à lancer.

## Le sommet

« Tu bouges la souris et la frontière entre les deux joueurs se déplace. » Il vit sur l'accueil.

## La phrase qu'on répète

C'est le site où tu pousses à la main la frontière entre les deux adversaires.

## Silence voulu

La régie des épreuves : seules les braises du fond bougent.

## Vérifié, pas vérifié

- Vérifié à l'écran : l'accueil avec le pointeur poussé à droite (trait déplacé, plans décalés). Tests, build et parcours automatique du site verts.
- Pas vérifié à l'écran : l'inclinaison des tuiles, l'aimant des boutons, le lancer du sceau, les étincelles au clic. Aucun téléphone réel.
