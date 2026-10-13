import { render, screen, within } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { enregistrerMatch } from '../storage/matchs'
import { matchDeTest, panier } from '../test/fixtures'
import { Accueil } from './Accueil'

function afficher() {
  render(<Accueil onNouveauMatch={vi.fn()} onReprendre={vi.fn()} onClubs={vi.fn()} onPartager={vi.fn()} />)
}

describe('Accueil', () => {
  it('met en avant le match en cours avec son score et sa période', async () => {
    await enregistrerMatch(matchDeTest(panier('A', 'a7', 2), { type: 'debutPeriode', periode: 'MT2' }))
    afficher()
    const carte = within(await screen.findByRole('region', { name: 'Match en cours' }))
    expect(carte.getByText('ST DELPHIN')).toBeInTheDocument()
    expect(carte.getByText('GRADIGNAN')).toBeInTheDocument()
    expect(carte.getByLabelText('Score du match en cours')).toHaveTextContent('2 – 0')
    expect(carte.getByText('2ème mi-temps')).toBeInTheDocument()
    expect(carte.getByRole('button', { name: 'Reprendre le match en cours' })).toHaveClass('btn-principal')
    expect(screen.getByRole('button', { name: 'Nouveau match' })).not.toHaveClass('btn-principal')
  })

  it('sans match en cours, « Nouveau match » est l’action principale', async () => {
    afficher()
    expect(await screen.findByRole('button', { name: 'Nouveau match' })).toHaveClass('btn-principal')
    expect(screen.queryByRole('region', { name: 'Match en cours' })).not.toBeInTheDocument()
  })
})
