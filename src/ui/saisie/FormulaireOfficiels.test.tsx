import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { definirOfficiels } from '../../domain/commandes'
import { OFFICIELS_VIDES } from '../../domain/match'
import type { Match } from '../../domain/types'
import { matchDeTest } from '../../test/fixtures'
import type { Appliquer } from '../useMatch'
import { FormulaireOfficiels } from './FormulaireOfficiels'

function afficher(match: Match = matchDeTest()) {
  const appliquer = vi.fn<Appliquer>(async () => null)
  render(<FormulaireOfficiels match={match} appliquer={appliquer} />)
  return { appliquer, user: userEvent.setup() }
}

describe('FormulaireOfficiels', () => {
  it('propose les sept champs, repliés sous « Officiels et capitaines »', () => {
    afficher()
    expect(screen.getByText('Officiels et capitaines')).toBeInTheDocument()
    expect(screen.getByLabelText('Chronométreur')).toBeInTheDocument()
    expect(screen.getByLabelText('Opérateur 30"')).toBeInTheDocument()
    expect(screen.getByLabelText('Marqueur')).toBeInTheDocument()
    expect(screen.getByLabelText('Arbitre')).toBeInTheDocument()
    expect(screen.getByLabelText('Aide arbitre')).toBeInTheDocument()
    expect(screen.getByLabelText('Capitaine A (ST DELPHIN)')).toBeInTheDocument()
    expect(screen.getByLabelText('Capitaine B (GRADIGNAN)')).toBeInTheDocument()
    expect(document.querySelector('details')).not.toHaveAttribute('open')
  })

  it('enregistre les officiels à la perte de focus', async () => {
    const { appliquer, user } = afficher()
    await user.type(screen.getByLabelText('Arbitre'), 'Camille R.')
    expect(appliquer).not.toHaveBeenCalled()
    await user.tab()
    expect(appliquer).toHaveBeenCalledTimes(1)
    const operation = appliquer.mock.calls[0][0]
    expect(operation(matchDeTest()).officiels).toEqual({ ...OFFICIELS_VIDES, arbitre: 'Camille R.' })
  })

  it('reprend les officiels déjà enregistrés', () => {
    afficher(definirOfficiels(matchDeTest(), { ...OFFICIELS_VIDES, marqueur: 'Alex' }))
    expect(screen.getByLabelText('Marqueur')).toHaveValue('Alex')
    expect(screen.getByLabelText('Capitaine A (ST DELPHIN)')).toHaveValue('')
  })
})
