import { Dexie } from 'dexie'
import { describe, expect, it } from 'vitest'
import { matchDeTest } from '../test/fixtures'
import { declarerSchema, type BaseTableDeMarque } from './db'

describe('schéma de la base', () => {
  it('conserve les matchs existants en passant au schéma 2', async () => {
    const nom = `migration-${Math.random()}`
    const ancienne = new Dexie(nom)
    ancienne.version(1).stores({ matchs: 'id, statut, modifieLe' })
    await ancienne.open()
    await ancienne.table('matchs').put(matchDeTest())
    ancienne.close()

    const nouvelle = new Dexie(nom) as BaseTableDeMarque
    declarerSchema(nouvelle)
    await nouvelle.open()
    expect(await nouvelle.matchs.count()).toBe(1)
    expect(await nouvelle.clubs.count()).toBe(0)
    expect(await nouvelle.licencies.count()).toBe(0)
    nouvelle.close()
    await Dexie.delete(nom)
  })
})
