import { nouvelId } from './match'
import type { Evenement, Match, NouvelEvenement } from './types'

export function ajouterEvenement(match: Match, evenement: NouvelEvenement): Match {
  return { ...match, evenements: [...match.evenements, { ...evenement, id: nouvelId() } as Evenement] }
}
