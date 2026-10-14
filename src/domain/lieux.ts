/**
 * Salles des clubs du championnat basket loisir UFOLEP 33, saison 2025-2026 (règlement, pages 4 et 5).
 * Seuls le club, la salle et la ville sont repris : jamais les coordonnées des responsables.
 * Changer de saison revient à mettre à jour cette liste.
 */
export interface Lieu {
  club: string
  salle: string
  ville: string
}

const SAISON_2025_2026: readonly Lieu[] = [
  { club: 'ESAL – Entente Sportive Audenge Lanton', salle: 'Complexe sportif Christiane Ballion', ville: 'Audenge' },
  { club: 'Basketball Barpais', salle: 'Gymnase du collège du Barp', ville: 'Le Barp' },
  { club: 'Biganos Basket Club', salle: 'Salle des sports Robert Paul', ville: 'Biganos' },
  { club: 'Carbon Blanc Basket', salle: 'Salle Philippe Madrelle', ville: 'Carbon-Blanc' },
  { club: 'C.A. Carignan', salle: 'Salle municipale', ville: 'Carignan' },
  { club: 'S.A. Gazinet-Cestas', salle: 'Salle Raymond Subrenat, complexe du Bouzet', ville: 'Cestas' },
  { club: 'Amicale des Basketteurs Gradignan', salle: 'Salle Jehan Buhan', ville: 'Gradignan' },
  { club: 'Les Petits Mousses Langoiran', salle: 'Salle René Baillet', ville: 'Langoiran' },
  { club: 'Basket Club de Marcheprime', salle: 'Complexe sportif Émilie Andéol', ville: 'Marcheprime' },
  { club: 'Marsas Basket Club', salle: 'Gymnase Pierre Macrez', ville: 'Marsas' },
  { club: 'Entente Pessac Basket Club', salle: 'Salle du Haut Livrac', ville: 'Pessac' },
  { club: 'Saint André Basket', salle: 'Gymnase la Garosse', ville: 'Saint-André-de-Cubzac' },
  { club: 'St Delphin', salle: 'Complexe sportif Elisabeth Riffiod', ville: 'Villenave-d’Ornon' },
  { club: 'Stade Bordelais', salle: 'Salle Virginia', ville: 'Bordeaux' },
  { club: 'U.S. Talence Basket Ball', salle: 'Salle Jean Bouin', ville: 'Talence' },
]

/** Lieux proposés à la préparation d'un match, triés par nom de club. */
export const LIEUX: readonly Lieu[] = [...SAISON_2025_2026].sort((a, b) => a.club.localeCompare(b.club, 'fr'))

/** Texte enregistré dans `match.lieu` : « St Delphin — Complexe sportif Elisabeth Riffiod, Villenave-d’Ornon ». */
export function libelleLieu(lieu: Lieu): string {
  return `${lieu.club} — ${lieu.salle}, ${lieu.ville}`
}
