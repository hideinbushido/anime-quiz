/**
 * Les portraits des personnages des Liens d'Ayanokoji.
 *
 * Il suffit de déposer une image dans `src/assets/ayanokoji/`, nommée d'après
 * l'identifiant du personnage (`kakashi.jpg`, `killerb.png`, `a.webp`…) : elle
 * apparaît sur sa carte, dans toutes les manches où il figure. Un personnage
 * sans image garde sa carte à initiale. La liste des noms attendus est dans
 * `src/assets/ayanokoji/LISEZMOI.md`.
 *
 * Ce module n'est chargé que par le site : le serveur n'a pas besoin des images.
 */
const files = import.meta.glob<string>("../assets/ayanokoji/*.{png,jpg,jpeg,webp,avif}", { eager: true, query: "?url", import: "default" });

const byId = new Map(Object.entries(files).map(([path, url]) => [path.slice(path.lastIndexOf("/") + 1, path.lastIndexOf(".")).toLowerCase(), url]));

export const characterImage = (id: string): string | undefined => byId.get(id.toLowerCase());
