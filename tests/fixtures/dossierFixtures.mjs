// DONNÉES DE TEST — jamais utilisées par le jeu.
// Deux univers minuscules, inventés, pour exercer le Dossier de L sur ses cinq
// rounds sans attendre les vraies colonnes de One Piece et de Dragon Ball.
const fiche = (id, couleur, pouvoirs, niveau) => ({ id, name: id.toUpperCase(), aliases: [`alias-${id}`], attributes: { couleur, pouvoirs, niveau } });

const attributes = [
  { key: 'couleur', label: 'Couleur', comparisonType: 'exact' },
  { key: 'pouvoirs', label: 'Pouvoirs', comparisonType: 'multi' },
  { key: 'niveau', label: 'Niveau', comparisonType: 'ordered' },
];

export const TEST_A = {
  id: 'test-a', name: 'Univers A', attributes,
  roster: [fiche('alpha', 'rouge', ['feu', 'vent'], 3), fiche('beta', 'rouge', ['feu', 'foudre'], 5), fiche('gamma', 'bleu', ['eau'], 1), fiche('delta', 'bleu', [], 3)],
};
export const TEST_B = {
  id: 'test-b', name: 'Univers B', attributes,
  roster: [fiche('un', 'vert', ['terre'], 2), fiche('deux', 'vert', ['terre'], 4)],
};
/** Cinq rounds, comme le vrai jeu : A, A, B, B, puis un univers encore vide. */
export const TEST_CONFIG = {
  universes: { 'test-a': TEST_A, 'test-b': TEST_B, vide: { id: 'vide', name: 'Univers vide', attributes: [], roster: [] } },
  rounds: ['test-a', 'test-a', 'test-b', 'test-b', 'vide'],
};
