import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { OFFICIELS_VIDES } from '../../domain/match'
import type { Match } from '../../domain/types'
import { matchDeTest, panier } from '../../test/fixtures'
import type { Appliquer } from '../useMatch'
import { genererFeuillePdf } from './feuille'
import { MatchTermine } from './MatchTermine'

vi.mock('./feuille', () => ({
  genererFeuillePdf: vi.fn(),
  enregistrerFichier: vi.fn(),
  prechargerFeuille: vi.fn(async () => undefined),
}))

const generer = vi.mocked(genererFeuillePdf)

/** Simule le vrai cycle : `appliquer` écrit de façon asynchrone et la prop `match` n'est rafraîchie qu'après. */
function afficher() {
  const match = matchDeTest(panier('A', 'a7', 2), { type: 'finMatch' })
  let courant = match
  const appliquer = vi.fn<Appliquer>(async (operation) => {
    await new Promise((resoudre) => setTimeout(resoudre, 50))
    courant = operation(courant)
    rendu.rerender(<MatchTermine match={courant} appliquer={appliquer} onRouvrir={vi.fn()} onAccueil={vi.fn()} />)
    return null
  })
  const rendu = render(<MatchTermine match={match} appliquer={appliquer} onRouvrir={vi.fn()} onAccueil={vi.fn()} />)
  return { user: userEvent.setup(), appliquer, lire: () => courant }
}

beforeEach(() => {
  generer.mockReset()
  generer.mockResolvedValue(new Uint8Array([37, 80, 68, 70]))
})

describe('MatchTermine — officiels et feuille', () => {
  it('le PDF reprend un officiel saisi juste avant le clic, sans attendre l’enregistrement', async () => {
    const { user } = afficher()
    await user.type(screen.getByLabelText('Arbitre'), 'Camille R.')
    await user.click(screen.getByRole('button', { name: 'Enregistrer le PDF' }))
    await waitFor(() => expect(generer).toHaveBeenCalled())
    const [matchTransmis] = generer.mock.calls[0]
    expect(matchTransmis.officiels).toEqual({ ...OFFICIELS_VIDES, arbitre: 'Camille R.' })
  })

  it('le lien e-mail et le PDF voient le même match', async () => {
    const { user } = afficher()
    await user.type(screen.getByLabelText('Marqueur'), 'Alex')
    await user.click(screen.getByRole('button', { name: 'Enregistrer le PDF' }))
    await waitFor(() => expect(generer).toHaveBeenCalled())
    const matchTransmis: Match = generer.mock.calls[0][0]
    expect(matchTransmis.officiels.marqueur).toBe('Alex')
  })

  it('enregistre les officiels au fil de la saisie, sans attendre la perte de focus', async () => {
    const { user, appliquer, lire } = afficher()
    await user.type(screen.getByLabelText('Arbitre'), 'Camille R.')
    expect(appliquer).toHaveBeenCalled()
    await waitFor(() => expect(lire().officiels.arbitre).toBe('Camille R.'))
  })
})
