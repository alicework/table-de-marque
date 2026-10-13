import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { definirPossession } from '../../domain/commandes'
import { calculerEtat } from '../../domain/etat'
import type { Match } from '../../domain/types'
import { faute, matchDeTest } from '../../test/fixtures'
import { Bandeau } from './Bandeau'

const fautesA = (n: number) => Array.from({ length: n }, (_, i) => faute('A', ['a4', 'a7', 'a9', 'a11'][i % 4]))

function afficher(match: Match, onPossession?: (equipe: 'A' | 'B') => void) {
  render(<Bandeau match={match} etat={calculerEtat(match)} onPossession={onPossession} />)
}

const voyantA = () => screen.getByLabelText("Fautes d'équipe ST DELPHIN")

describe('Bandeau — voyant de fautes d’équipe', () => {
  it('neutre sous 7', () => {
    afficher(matchDeTest(...fautesA(6)))
    expect(voyantA()).toHaveClass('niveau-normal')
    expect(voyantA()).toHaveTextContent('Fautes éq. 6/8')
    expect(voyantA()).not.toHaveTextContent('2 LF')
  })

  it('attention à 7, limite à 8', () => {
    afficher(matchDeTest(...fautesA(7)))
    expect(voyantA()).toHaveClass('niveau-attention')
  })

  it('pénalité avec « 2 LF » dès 9', () => {
    afficher(matchDeTest(...fautesA(9)))
    expect(voyantA()).toHaveClass('niveau-penalite')
    expect(voyantA()).toHaveTextContent('Fautes éq. 9/8 · 2 LF')
  })
})

describe('Bandeau — flèche de possession', () => {
  const cote = (nom: string) => screen.getByRole('button', { name: `Possession ${nom}` })

  it('n’est pas rendue sans onPossession', () => {
    afficher(matchDeTest())
    expect(screen.queryByRole('group', { name: 'Flèche de possession' })).not.toBeInTheDocument()
  })

  it('montre les deux côtés non pressés quand elle n’est pas définie', () => {
    afficher(matchDeTest(), vi.fn())
    expect(cote('ST DELPHIN')).toHaveAttribute('aria-pressed', 'false')
    expect(cote('GRADIGNAN')).toHaveAttribute('aria-pressed', 'false')
  })

  it('presse le côté actif', () => {
    afficher(definirPossession(matchDeTest(), 'B'), vi.fn())
    expect(cote('ST DELPHIN')).toHaveAttribute('aria-pressed', 'false')
    expect(cote('GRADIGNAN')).toHaveAttribute('aria-pressed', 'true')
  })

  it('accepte un match enregistré sans champ possession', () => {
    const ancien: Match = { ...matchDeTest() }
    delete ancien.possession
    afficher(ancien, vi.fn())
    expect(cote('ST DELPHIN')).toHaveAttribute('aria-pressed', 'false')
  })

  it('appelle onPossession avec le côté tapé, sauf s’il est déjà actif', () => {
    const onPossession = vi.fn()
    afficher(definirPossession(matchDeTest(), 'A'), onPossession)
    cote('GRADIGNAN').click()
    expect(onPossession).toHaveBeenCalledWith('B')
    cote('ST DELPHIN').click()
    expect(onPossession).toHaveBeenCalledTimes(1)
  })
})
