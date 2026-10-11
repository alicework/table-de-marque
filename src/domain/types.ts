export type EquipeId = 'A' | 'B'
export const EQUIPES: readonly EquipeId[] = ['A', 'B']

export type Civilite = 'M' | 'Mme' | null

/** MT1, MT2, puis P1, P2… pour les prolongations. */
export type Periode = 'MT1' | 'MT2' | `P${number}`

export interface JoueurMatch {
  id: string
  licence: string
  nom: string
  prenom: string
  civilite: Civilite
  numero: number
}

export type Coach =
  | { type: 'joueur'; joueurId: string }
  | { type: 'libre'; nom: string }
  | null

export interface EquipeMatch {
  nom: string
  couleur: string
  joueurs: JoueurMatch[]
  coach: Coach
}

export interface Officiels {
  chronometreur: string
  operateur30s: string
  marqueur: string
  arbitre: string
  aideArbitre: string
  capitaineA: string
  capitaineB: string
}

export type Evenement =
  | { id: string; type: 'panier'; equipe: EquipeId; joueurId: string; valeur: 1 | 2 | 3 }
  /** joueurId null = faute du coach */
  | { id: string; type: 'faute'; equipe: EquipeId; joueurId: string | null }
  | { id: string; type: 'tempsMort'; equipe: EquipeId }
  | { id: string; type: 'debutPeriode'; periode: Periode }
  | { id: string; type: 'finMatch' }

type SansId<T> = T extends unknown ? Omit<T, 'id'> : never
export type NouvelEvenement = SansId<Evenement>

export type StatutMatch = 'en_cours' | 'termine'

export interface Match {
  id: string
  versionFormat: 1
  /** AAAA-MM-JJ */
  date: string
  lieu: string
  statut: StatutMatch
  equipes: Record<EquipeId, EquipeMatch>
  officiels: Officiels
  evenements: Evenement[]
  creeLe: string
  modifieLe: string
}
