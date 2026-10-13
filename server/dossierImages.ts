/**
 * Les portraits du Dossier de L. Il suffit de déposer une image dans
 * `public/dossier/<univers>/`, nommée d'après l'identifiant du personnage
 * (`monkey-d-luffy.png`, `son-goku.webp`…) : le serveur la repère au
 * démarrage et la rattache à sa fiche. Un personnage sans image garde son initiale.
 */
import { existsSync, readdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import type { DossierConfig } from "../src/dossier/data/universes.ts";

const IMAGE = /\.(png|jpe?g|webp|avif)$/i;

export function attachDossierImages(config: DossierConfig, publicDir = join(dirname(fileURLToPath(import.meta.url)), "..", "public")): number {
  let count = 0;
  for (const universe of Object.values(config.universes)) {
    const folder = join(publicDir, "dossier", universe.id);
    if (!existsSync(folder)) continue;
    const files = new Map(readdirSync(folder).filter(file => IMAGE.test(file)).map(file => [file.replace(IMAGE, "").toLowerCase(), file]));
    for (const character of universe.roster) {
      const file = files.get(character.id);
      if (!file) continue;
      character.image = `/dossier/${universe.id}/${file}`;
      count++;
    }
  }
  return count;
}
