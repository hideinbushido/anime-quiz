/**
 * La vidéo qui explique une épreuve, jouée sur le live à son lancement.
 * Pour en ajouter une : déposer le fichier dans `public/regles/`, nommé d'après
 * l'identifiant de l'épreuve (`pensees-anya.mp4`, `dossier-l.mp4`…). Rien d'autre
 * à déclarer : le site la trouve tout seul.
 */
export const REGLE_VIDEOS: Record<string, string> = {
  "blind-test-openings": "/regles/blind-test-openings.mp4",
  "pensees-anya": "/regles/pensees-anya.mp4",
};

/** L'adresse de la vidéo des règles d'une épreuve, si le fichier existe. */
export async function findRulesVideo(epreuveId: string): Promise<string | null> {
  if (REGLE_VIDEOS[epreuveId]) return REGLE_VIDEOS[epreuveId];
  const src = `/regles/${epreuveId}.mp4`;
  try {
    const response = await fetch(src, { method: "HEAD" });
    // Un site d'une seule page répond « 200 » à tout : seul un vrai fichier vidéo compte
    return response.ok && (response.headers.get("content-type") ?? "").startsWith("video/") ? src : null;
  } catch { return null; }
}
