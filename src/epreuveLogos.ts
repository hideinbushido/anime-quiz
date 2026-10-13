/**
 * Les logos des épreuves : des badges composés à partir du personnage de chaque
 * épreuve (voir scripts/logos). La clé est l'identifiant de l'épreuve, la valeur
 * le nom du fichier dans public/logos-epreuves/.
 */
export const EPREUVE_LOGOS: Record<string, string> = {
  "blind-test-openings": "les-beats-de-killer-bee",
  "liens-ayanokoji": "les-liens-d-ayanokoji",
  "citations-cultes": "repliques-cultes",
  "pensees-anya": "les-pensees-d-anya",
  "dossier-l": "le-dossier-de-l",
};

/** Vrai si le logo de l'épreuve porte déjà son nom : inutile de le répéter à côté. */
export function hasLogo(epreuveId: string): boolean {
  return epreuveId in EPREUVE_LOGOS;
}
