/**
 * Copie des jetons de `src/styles/jetons.css` : pdf-lib ne lit pas le CSS.
 * Seconde (et dernière) source de couleurs littérales du projet ; `couleurs.test.ts` vérifie l'égalité avec le CSS.
 */
export const JETONS_PDF = {
  fond: '#f5f4f0',
  surface: '#ffffff',
  'surface-2': '#edece7',
  bordure: '#e3e1db',
  texte: '#1d1c1a',
  'texte-2': '#66645e',
  accent: '#c24f12',
  'accent-tint': '#fbeadf',
  'equipe-a': '#b83c35',
  'equipe-b': '#2d63c4',
  faute: '#9a3d2e',
  danger: '#b42318',
} as const

export type NomCouleur = keyof typeof JETONS_PDF

/** « #c24f12 » → [0.76, 0.31, 0.07] : composantes de 0 à 1 pour pdf-lib. */
export function versRvb(hex: string): [number, number, number] {
  const composante = (i: number) => parseInt(hex.slice(i, i + 2), 16) / 255
  return [composante(1), composante(3), composante(5)]
}
