/** Règlement basket loisir UFOLEP 33, saison 2025-2026. Seul endroit où ces seuils existent. */
export const REGLES = {
  fautesPersoMax: 5,
  seuilFautesEquipe: 8,
  alerteFautesEquipe: 7,
  joueursMax: 14,
  joueusesMin: 2,
  numeroMin: 0,
  numeroMax: 99,
} as const

/** Durée des arrêts de jeu, en secondes. */
export const PAUSES = {
  tempsMort: 60,
  miTemps: 600,
  avantProlongation: 120,
} as const

/** Adresse à laquelle la feuille de match est retournée, imprimée sur la feuille officielle. */
export const ADRESSE_COMITE = 'cd.33@ufolep.org'
