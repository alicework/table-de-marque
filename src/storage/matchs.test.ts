import { describe, expect, it } from 'vitest'
import { matchDeTest, panier } from '../test/fixtures'
import { enregistrerMatch, lireMatch, matchEnCours } from './matchs'

describe('stockage des matchs', () => {
  it('enregistre et relit un match', async () => {
    const match = await enregistrerMatch(matchDeTest(panier('A', 'a7', 2)), new Date('2026-10-16T20:00:00Z'))
    const relu = await lireMatch(match.id)
    expect(relu?.evenements).toHaveLength(1)
    expect(relu?.modifieLe).toBe('2026-10-16T20:00:00.000Z')
  })

  it('déduit le statut de la présence d’un événement de fin de match', async () => {
    const enCours = await enregistrerMatch(matchDeTest())
    const termine = await enregistrerMatch(matchDeTest({ type: 'finMatch' }))
    expect(enCours.statut).toBe('en_cours')
    expect(termine.statut).toBe('termine')
  })

  it('renvoie le match en cours modifié le plus récemment', async () => {
    const ancien = await enregistrerMatch(matchDeTest(), new Date('2026-10-16T19:00:00Z'))
    const recent = await enregistrerMatch(matchDeTest(), new Date('2026-10-16T21:00:00Z'))
    await enregistrerMatch(matchDeTest({ type: 'finMatch' }), new Date('2026-10-16T22:00:00Z'))
    expect((await matchEnCours())?.id).toBe(recent.id)
    expect(ancien.id).not.toBe(recent.id)
  })

  it('ne renvoie rien quand aucun match n’est en cours', async () => {
    expect(await matchEnCours()).toBeUndefined()
  })
})
