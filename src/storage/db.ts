import { Dexie, type EntityTable } from 'dexie'
import type { Club, Licencie } from '../domain/club'
import type { Match } from '../domain/types'

export type BaseTableDeMarque = Dexie & {
  matchs: EntityTable<Match, 'id'>
  clubs: EntityTable<Club, 'id'>
  licencies: EntityTable<Licencie, 'id'>
}

/** Historique complet du schéma : ne jamais modifier une version publiée, en ajouter une. */
export function declarerSchema(base: Dexie): void {
  base.version(1).stores({
    matchs: 'id, statut, modifieLe',
  })
  base.version(2).stores({
    clubs: 'id, numeroAssociation',
    licencies: 'id, clubId, [clubId+licence]',
  })
}

export const db = new Dexie('table-de-marque') as BaseTableDeMarque
declarerSchema(db)
