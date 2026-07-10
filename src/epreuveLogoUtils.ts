const EPREUVES_AVEC_LOGO_COMPLET = new Set([
  "blind-test-openings",
  "liens-ayanokoji",
]);

export function hasFullLogo(epreuveId: string): boolean {
  return EPREUVES_AVEC_LOGO_COMPLET.has(epreuveId);
}
