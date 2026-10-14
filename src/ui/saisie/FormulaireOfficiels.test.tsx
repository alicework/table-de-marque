import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { OFFICIELS_VIDES } from '../../domain/match'
import type { Officiels } from '../../domain/types'
import { matchDeTest } from '../../test/fixtures'
import { FormulaireOfficiels } from './FormulaireOfficiels'

function afficher(officiels: Officiels = OFFICIELS_VIDES) {
  const onChange = vi.fn<(officiels: Officiels) => void>()
  render(<FormulaireOfficiels match={matchDeTest()} officiels={officiels} onChange={onChange} />)
  return { onChange, user: userEvent.setup() }
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

  it('remonte chaque frappe au parent avec les sept valeurs', async () => {
    const { onChange, user } = afficher()
    await user.type(screen.getByLabelText('Arbitre'), 'C')
    expect(onChange).toHaveBeenCalledWith({ ...OFFICIELS_VIDES, arbitre: 'C' })
  })

  it('affiche les valeurs reçues', () => {
    afficher({ ...OFFICIELS_VIDES, marqueur: 'Alex' })
    expect(screen.getByLabelText('Marqueur')).toHaveValue('Alex')
    expect(screen.getByLabelText('Capitaine A (ST DELPHIN)')).toHaveValue('')
  })
})
