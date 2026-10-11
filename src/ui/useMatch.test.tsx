import { act, renderHook, waitFor } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { ajouterEvenement } from '../domain/commandes'
import { db } from '../storage/db'
import { enregistrerMatch, lireMatch } from '../storage/matchs'
import { matchDeTest, panier } from '../test/fixtures'
import { MESSAGE_ERREUR_STOCKAGE, useMatch } from './useMatch'

async function monter() {
  const match = await enregistrerMatch(matchDeTest())
  const rendu = renderHook(() => useMatch(match.id))
  await waitFor(() => expect(rendu.result.current.match).toBeDefined())
  return { id: match.id, result: rendu.result }
}

describe('useMatch', () => {
  it('applique une opération et la persiste', async () => {
    const { id, result } = await monter()
    let retour: string | null = 'non appelé'
    await act(async () => {
      retour = await result.current.appliquer((m) => ajouterEvenement(m, panier('A', 'a7', 2)))
    })
    expect(retour).toBeNull()
    expect((await lireMatch(id))?.evenements).toHaveLength(1)
    await waitFor(() => expect(result.current.match?.evenements).toHaveLength(1))
  })

  it('enchaîne les opérations rapprochées sans en perdre', async () => {
    const { id, result } = await monter()
    await act(async () => {
      await Promise.all([
        result.current.appliquer((m) => ajouterEvenement(m, panier('A', 'a7', 2))),
        result.current.appliquer((m) => ajouterEvenement(m, panier('B', 'b8', 3))),
      ])
    })
    expect((await lireMatch(id))?.evenements).toHaveLength(2)
  })

  it('renvoie le message d’une erreur métier sans rien enregistrer', async () => {
    const { id, result } = await monter()
    let retour: string | null = null
    await act(async () => {
      retour = await result.current.appliquer(() => {
        throw new Error('Interdit')
      })
    })
    expect(retour).toBe('Interdit')
    expect((await lireMatch(id))?.evenements).toHaveLength(0)
    expect(result.current.erreurStockage).toBeNull()
  })

  it('signale un échec d’écriture', async () => {
    const { result } = await monter()
    vi.spyOn(db.matchs, 'put').mockRejectedValueOnce(new Error('QuotaExceededError'))
    let retour: string | null = null
    await act(async () => {
      retour = await result.current.appliquer((m) => ajouterEvenement(m, panier('A', 'a7', 2)))
    })
    expect(retour).toBe(MESSAGE_ERREUR_STOCKAGE)
    expect(result.current.erreurStockage).toBe(MESSAGE_ERREUR_STOCKAGE)
  })
})
