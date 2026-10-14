# Brief — Règles des Pensées d'Anya

- workflow: general-video
- flow: automation
- storyboard: no
- language: fr
- aspect: 1920x1080 (16:9, live paysage)
- length: 33 s
- audio: un petit jazz d'espion synthétisé (scripts/bande-son.py), des scintillements de télépathie, et deux bruitages du présentateur : bonne réponse, « faaah » sur le strike.
- destination: `public/regles/pensees-anya.mp4`, jouée sur le live et les écrans des joueurs au lancement de l'épreuve.

## Message

Les règles telles qu'elles se jouent depuis le 2026-10-13 : pas de buzzer, on répond à voix haute et le présentateur donne la main ; trois strikes et on sort de la manche ; les points restent secrets et tombent un par un, au clic du présentateur, de la moins citée à la plus citée ; trois manches.

## Identité

Propre à Anya, pas au gabarit de Killer Bee (demande du présentateur, 2026-10-14) : l'univers Spy × Family. Nuit violette, rose de ses cheveux, vert de ses yeux, papier crème des dossiers secrets, tampons rouges, photo d'identité tenue par un trombone, ondes de télépathie, bulles de pensée, cacahuètes. Titres en Fredoka, dossiers en Special Elite. Phrases simples, sans rimes. La photo d'Anya n'est pas détourée : le détourage automatique échoue sur un dessin.

## Source des règles

`src/data/regles.ts` (entrée `pensees-anya`), `src/feud/reducer.ts`, et la manche 1 de `src/feud/data.ts` pour l'exemple (valeurs encore provisoires).
