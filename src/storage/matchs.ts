import type { Match } from '../domain/types'
import { db } from './db'

export async function enregistrerMatch(match: Match, maintenant = new Date()): Promise<Match> {
  const aEnregistrer: Match = {
    ...match,
    statut: match.evenements.some((e) => e.type === 'finMatch') ? 'termine' : 'en_cours',
    modifieLe: maintenant.toISOString(),
  }
  await db.matchs.put(aEnregistrer)
  return aEnregistrer
}

export function lireMatch(id: string): Promise<Match | undefined> {
  return db.matchs.get(id)
}

export async function matchEnCours(): Promise<Match | undefined> {
  const enCours = await db.matchs.where('statut').equals('en_cours').toArray()
  return enCours.sort((a, b) => b.modifieLe.localeCompare(a.modifieLe))[0]
}
