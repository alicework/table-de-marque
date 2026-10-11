import { calculerEtat } from './etat'
import { nouvelId } from './match'
import { choixFinPeriode, periodeSuivante, type ChoixFinPeriode } from './periodes'
import type { Evenement, Match, NouvelEvenement } from './types'

export function ajouterEvenement(match: Match, evenement: NouvelEvenement): Match {
  return { ...match, evenements: [...match.evenements, { ...evenement, id: nouvelId() } as Evenement] }
}

export function annulerDernier(match: Match): Match {
  if (match.evenements.length === 0) return match
  return { ...match, evenements: match.evenements.slice(0, -1) }
}

export function remplacerEvenement(match: Match, evenement: Evenement): Match {
  return { ...match, evenements: match.evenements.map((e) => (e.id === evenement.id ? evenement : e)) }
}

export function supprimerEvenement(match: Match, id: string): Match {
  return { ...match, evenements: match.evenements.filter((e) => e.id !== id) }
}

export function appliquerFinPeriode(match: Match, choix: ChoixFinPeriode): Match {
  const etat = calculerEtat(match)
  if (!choixFinPeriode(etat).includes(choix)) throw new Error(`Choix impossible : ${choix}`)
  if (choix === 'finMatch') return ajouterEvenement(match, { type: 'finMatch' })
  return ajouterEvenement(match, { type: 'debutPeriode', periode: periodeSuivante(etat.periode) })
}

export function rouvrirMatch(match: Match): Match {
  return { ...match, evenements: match.evenements.filter((e) => e.type !== 'finMatch') }
}
