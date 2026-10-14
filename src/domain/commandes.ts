import { calculerEtat } from './etat'
import { nouvelId, OFFICIELS_VIDES } from './match'
import { choixFinPeriode, periodeSuivante, type ChoixFinPeriode } from './periodes'
import type { EquipeId, Evenement, Match, NouvelEvenement, Officiels } from './types'

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

/** La flèche n'est pas un événement : le journal, « Annuler » et les corrections l'ignorent. */
export function definirPossession(match: Match, equipe: EquipeId): Match {
  if (match.possession === equipe) return match
  return { ...match, possession: equipe }
}

/** Les officiels ne sont pas des événements : le journal, « Annuler » et les corrections les ignorent. */
export function definirOfficiels(match: Match, officiels: Officiels): Match {
  const cles = Object.keys(OFFICIELS_VIDES) as (keyof Officiels)[]
  const rognes: Officiels = { ...OFFICIELS_VIDES }
  for (const cle of cles) rognes[cle] = officiels[cle].trim()
  if (cles.every((cle) => rognes[cle] === match.officiels[cle])) return match
  return { ...match, officiels: rognes }
}
