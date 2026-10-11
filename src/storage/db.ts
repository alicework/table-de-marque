import { Dexie, type EntityTable } from 'dexie'
import type { Match } from '../domain/types'

export const db = new Dexie('table-de-marque') as Dexie & {
  matchs: EntityTable<Match, 'id'>
}

db.version(1).stores({
  matchs: 'id, statut, modifieLe',
})
