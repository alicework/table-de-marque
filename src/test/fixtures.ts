import { ajouterEvenement } from '../domain/commandes'
import { nouveauMatch } from '../domain/match'
import type { Civilite, EquipeId, EquipeMatch, JoueurMatch, Match, NouvelEvenement, Periode } from '../domain/types'

function joueur(id: string, numero: number, civilite: Civilite = 'M'): JoueurMatch {
  return { id, numero, civilite, licence: `LIC-${id}`, nom: `Nom${id}`, prenom: `Prenom${id}` }
}

export const EQUIPE_A: EquipeMatch = {
  nom: 'ST DELPHIN',
  couleur: 'Vert',
  joueurs: [joueur('a4', 4, 'Mme'), joueur('a7', 7), joueur('a9', 9, 'Mme'), joueur('a11', 11), joueur('a15', 15)],
  coach: { type: 'joueur', joueurId: 'a7' },
}

export const EQUIPE_B: EquipeMatch = {
  nom: 'GRADIGNAN',
  couleur: 'Noir',
  joueurs: [joueur('b5', 5, 'Mme'), joueur('b8', 8), joueur('b10', 10, 'Mme')],
  coach: { type: 'libre', nom: 'Morgan F.' },
}

export function matchDeTest(...evenements: NouvelEvenement[]): Match {
  const base = nouveauMatch(
    { date: '2026-10-16', lieu: 'Villenave-d’Ornon', equipes: { A: EQUIPE_A, B: EQUIPE_B } },
    new Date('2026-10-16T19:00:00Z'),
  )
  return evenements.reduce(ajouterEvenement, base)
}

export const panier = (equipe: EquipeId, joueurId: string, valeur: 1 | 2 | 3): NouvelEvenement => ({
  type: 'panier',
  equipe,
  joueurId,
  valeur,
})
export const faute = (equipe: EquipeId, joueurId: string | null): NouvelEvenement => ({ type: 'faute', equipe, joueurId })
export const tempsMort = (equipe: EquipeId): NouvelEvenement => ({ type: 'tempsMort', equipe })
export const debut = (periode: Periode): NouvelEvenement => ({ type: 'debutPeriode', periode })
