# Quiz'Animanga — LIVE 1v1

Application React + TypeScript + Vite, avec l'identité arcade du projet original.
Deux joueurs s'affrontent sur **exactement cinq épreuves distinctes**.

## Démarrer

```sh
npm install
npm run dev
npm run build
npm run lint
npm test
```

Les tests utilisent Node 24 et son support TypeScript natif, sans bibliothèque supplémentaire.
`npm run test:browser` lance Chrome sans fenêtre avec un profil isolé, démarre Vite
sur le port 4175 et écrit des captures dans `test-output/` (ignoré par Git).
Le chemin Chrome par défaut est celui de Windows ; `CHROME_PATH` permet de le remplacer.

## Parcours du LIVE

1. Saisir les deux noms.
2. Joueur 1 choisit deux épreuves et leur classe D/C/B/A.
3. Joueur 2 fait ses deux choix, puis le présentateur fait le cinquième.
4. Vérifier le programme complet et lancer le duel.
5. Avant chaque réponse, le présentateur désigne le joueur qui répond.
6. La validation attribue les points à ce joueur, une seule fois.
7. Après cinq épreuves, le récapitulatif détaille les scores et les manches.

**Le catalogue contient encore trois épreuves.** La sélection peut être préparée,
mais le lancement reste bloqué jusqu'à cinq choix. Aucune épreuve fictive n'est
ajoutée pour contourner cette règle. Les fixtures des tests simulent un catalogue
plus grand uniquement pour vérifier le déroulement complet.

Le bouton **Essayer / voir les classes** permet de jouer une épreuve isolée dès
maintenant. L'essai n'affecte ni le LIVE sauvegardé ni l'historique. Il repart à zéro
après actualisation. Le LIVE, lui, sauvegarde aussi la manche, la saisie, les cartes
placées, le joueur désigné et les réponses validées. La position de lecture audio
n'est pas sauvegardée.

## Architecture

### Accueil bleu électrique

L'accueil possède son thème isolé dans `src/components/title/TitleScreen.css` :
bleu nuit, bleu électrique pour Joueur 1, cyan pour Joueur 2. Le joystick et le
nom Quiz'Animanga sont conservés dans une variante du logo. La scène Three.js
existante accompagne le VS ; le formulaire et le bouton restent utilisables
si WebGL est indisponible.

`TitleScreen` compose les cartes joueurs, le VS et le panneau de reprise.
Le bouton « Entrer dans l'arène » ouvre la sélection et reste désactivé tant
que les deux noms ne contiennent pas de texte autre que des espaces.

Les noms en cours de saisie sont mémorisés séparément sous
`anime-quiz-title-players-v1`, avant même le lancement. Ils n'altèrent pas le
duel sauvegardé. Le panneau « Reprendre le duel » restaure celui-ci avec sa
phase, ses sélections, sa progression et ses scores. Effacer la session vide
aussi les deux champs ; l'historique est conservé. La persistance du LIVE
continue d'utiliser les mêmes clés et validations qu'avant cette refonte.

### Session et jeux

- `src/types.ts` : session de duel, joueurs, sélection, classes et résultats détaillés.
- `src/duel/engine.ts` : transitions de sélection et de jeu, attribution et calcul des scores.
- `src/duel/storage.ts` : validation des sauvegardes et historique local versionné.
- `src/duel/useDuel.ts` : intégration React et sauvegarde automatique.
- `src/App.tsx` : navigation entre accueil, sélection, jeu, récapitulatif et historique.
- `src/components/DuelHeader.tsx`, `DuelStage.tsx` : bandeau et commandes communes.
- `src/components/EpreuvePlayer.tsx` : dispatch vers le jeu spécifique ; écrans audio et citations conservés.
- `src/components/LogicLinksPlayer.tsx` : placement libre et correction des chaînes.
- `src/duel/logicSolver.ts` : relations directionnelles/symétriques, validation et recherche exhaustive.
- `src/duel.css` : styles du duel en complément de `App.css`, conservé.

Les scores sont recalculés depuis les réponses détaillées, pour éviter les doubles
attributions lors des rechargements ou validations répétées. Le joueur qui répond
est indépendant de celui qui a choisi l'épreuve. Aucun buzz, vol ou chrono n'est
ajouté à ce stade. Le barème conservé est de 100 points par réponse, et de 100
points par position correcte pour Ayanokoji, sans multiplicateur de classe.

Les clés `anime-quiz-duel-v2` et `anime-quiz-duel-history-v2` isolent le nouveau
format. Les anciennes données solo sont conservées ; leur classement est
consultable dans les archives. Les anciennes sessions ne sont pas converties
automatiquement en duel, car elles ne contiennent pas de second joueur.

Les URL directes sont validées contre la session : `/jeu` sans duel valide retourne
à l'accueil. Une ancienne URL ne permet pas de rejouer une épreuve terminée.

## Les Liens d'Ayanokoji

Les quatre démonstrations sont dans `src/data/logicLinksDemos.ts` :

| Classe | Cartes | Leurres | Principe |
| --- | ---: | ---: | --- |
| D | 6 | 0 | Transmission entre maîtres et élèves |
| C | 8 | 2 | Branches concurrentes |
| B | 10 | 4 | Fragments de chaînes valides qui mènent à une impasse |
| A | 12 | 6 | Invasion de Konoha, maître commun, apprentissage et succession |

D, C et B partagent une chaîne pédagogique avec davantage de leurres. A utilise
une autre chaîne. Ce sont des démonstrations du système ; il reste à enrichir la
banque de puzzles avant des émissions répétées et à calibrer leur difficulté.

Chaque règle liste les paires autorisées **parmi les personnages du puzzle**,
son sens et une explication de correction. Les tests recherchent les solutions
sans consulter `solutionIds` : ils exigent une solution unique, identique à la
solution éditoriale, et au moins une relation pour chaque leurre. B et A doivent
également contenir plusieurs fragments trompeurs valides.

Cette unicité est garantie pour le graphe encodé. Lors de l'ajout d'un puzzle,
vérifier que les paires sont exhaustives au regard du texte des indices et du
canon, pour ne pas rejeter une autre réponse narrative légitime.

Les relations s'appuient notamment sur les colonnes officielles consacrées à
[Tobirama](https://naruto-official.com/en/news/01_1694),
[Jiraiya](https://naruto-official.com/en/news/01_1643),
[Kakashi](https://naruto-official.com/en/news/01_1903),
[Tsunade](https://naruto-official.com/en/news/01_1868) et
[Minato](https://naruto-official.com/en/news/01_1681).
Les sources sont aussi attachées aux puzzles pour leur révision éditoriale.

La base `narutoCharacters.ts` reste intacte. Le champ facultatif `relations`
prépare des enrichissements ciblés. Les anciens puzzles restent dans
`legacyAyanokojiPuzzles` comme contenu à retravailler, hors du catalogue jouable.

## Ajouter les prochaines épreuves

Ajouter chaque jeu dans `src/data/epreuves.ts` avec un ID stable et quatre
configurations `difficulties`. Ajouter son composant au dispatch de
`EpreuvePlayer` et utiliser `GameControls` pour la progression et les réponses.
Une réponse doit avoir un `roundId` stable. La logique commune s'occupe de
l'attribution, de la sauvegarde et du passage à l'épreuve suivante.

Pour l'instant, Beats et Répliques proposent les quatre classes dans la sélection,
mais utilisent le contenu existant commun (`status: "shared"`), clairement indiqué
dans l'interface. Leurs variantes spécifiques restent à écrire. Le blind test
conserve aussi ses réponses provisoires aux manches 6 et 7 et ses médias de
révélation incomplets. Tous les assets existants sont conservés.
