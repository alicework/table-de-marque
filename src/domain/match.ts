import type { EquipeId, EquipeMatch, JoueurMatch, Match, Officiels } from './types'

export const OFFICIELS_VIDES: Officiels = {
  chronometreur: '',
  operateur30s: '',
  marqueur: '',
  arbitre: '',
  aideArbitre: '',
  capitaineA: '',
  capitaineB: '',
}

/** randomUUID n'existe qu'en contexte sécurisé (https, localhost) : repli pour un essai en http sur le réseau local. */
export function nouvelId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') return crypto.randomUUID()
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`
}

export const parNumero = (a: JoueurMatch, b: JoueurMatch) => a.numero - b.numero

export function nouveauMatch(
  params: { date: string; lieu: string; equipes: Record<EquipeId, EquipeMatch> },
  maintenant = new Date(),
): Match {
  const horodatage = maintenant.toISOString()
  return {
    id: nouvelId(),
    versionFormat: 1,
    date: params.date,
    lieu: params.lieu,
    statut: 'en_cours',
    equipes: params.equipes,
    officiels: { ...OFFICIELS_VIDES },
    evenements: [],
    creeLe: horodatage,
    modifieLe: horodatage,
  }
}
