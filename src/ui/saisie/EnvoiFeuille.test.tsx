import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { calculerEtat } from '../../domain/etat'
import type { Match } from '../../domain/types'
import { matchDeTest, panier } from '../../test/fixtures'
import { EnvoiFeuille } from './EnvoiFeuille'
import { enregistrerFichier, genererFeuillePdf } from './feuille'

vi.mock('./feuille', () => ({ genererFeuillePdf: vi.fn(), enregistrerFichier: vi.fn() }))

const generer = vi.mocked(genererFeuillePdf)
const enregistrer = vi.mocked(enregistrerFichier)
const OCTETS = new Uint8Array([37, 80, 68, 70])

function afficher(match: Match = matchDeTest(panier('A', 'a7', 2), { type: 'finMatch' })) {
  render(<EnvoiFeuille match={match} etat={calculerEtat(match)} />)
  return { match, user: userEvent.setup() }
}

const lienCourriel = () => screen.getByRole('link', { name: "Préparer l'e-mail" })

beforeEach(() => {
  generer.mockReset()
  enregistrer.mockReset()
  generer.mockResolvedValue(OCTETS)
  enregistrer.mockResolvedValue(undefined)
})

describe('EnvoiFeuille — PDF', () => {
  it('génère puis enregistre la feuille sous son nom', async () => {
    const { match, user } = afficher()
    await user.click(screen.getByRole('button', { name: 'Enregistrer le PDF' }))
    await waitFor(() => expect(enregistrer).toHaveBeenCalledWith(OCTETS, '2026-10-16_ST-DELPHIN-GRADIGNAN.pdf'))
    expect(generer).toHaveBeenCalledWith(match, calculerEtat(match))
  })

  it('désactive le bouton pendant la préparation', async () => {
    let terminer: (octets: Uint8Array) => void = () => undefined
    generer.mockReturnValue(
      new Promise<Uint8Array>((resoudre) => {
        terminer = resoudre
      }),
    )
    const { user } = afficher()
    await user.click(screen.getByRole('button', { name: 'Enregistrer le PDF' }))
    const bouton = screen.getByRole('button', { name: 'Préparation…' })
    expect(bouton).toBeDisabled()
    terminer(OCTETS)
    expect(await screen.findByRole('button', { name: 'Enregistrer le PDF' })).toBeEnabled()
  })

  it('affiche un dialogue si la génération échoue', async () => {
    generer.mockRejectedValue(new Error('Police introuvable : Manrope'))
    const { user } = afficher()
    await user.click(screen.getByRole('button', { name: 'Enregistrer le PDF' }))
    const dialogue = await screen.findByRole('dialog', { name: 'Feuille impossible à générer' })
    expect(dialogue).toHaveTextContent('Police introuvable : Manrope')
    await user.click(screen.getByRole('button', { name: 'Fermer' }))
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(enregistrer).not.toHaveBeenCalled()
  })

  it('rappelle le nom du fichier à joindre', () => {
    afficher()
    expect(screen.getByText(/Joignez le fichier/)).toHaveTextContent(
      'Joignez le fichier 2026-10-16_ST-DELPHIN-GRADIGNAN.pdf à l’e-mail.',
    )
  })
})

describe('EnvoiFeuille — e-mail', () => {
  it('lien mailto vers le comité, sans cc par défaut', () => {
    afficher()
    const href = lienCourriel().getAttribute('href') ?? ''
    expect(href.startsWith('mailto:cd.33@ufolep.org?')).toBe(true)
    expect(href).not.toContain('cc=')
    expect(href).toContain('subject=')
  })

  it('ajoute le coach adverse en cc', async () => {
    const { user } = afficher()
    await user.type(screen.getByLabelText('E-mail du coach adverse (facultatif)'), 'coach@exemple.fr')
    expect(lienCourriel().getAttribute('href')).toContain('cc=coach%40exemple.fr')
  })

  it('refuse une adresse invalide', async () => {
    const { user } = afficher()
    await user.type(screen.getByLabelText('E-mail du coach adverse (facultatif)'), 'pas-un-mail')
    expect(screen.getByRole('alert')).toHaveTextContent('Adresse e-mail invalide')
    expect(screen.queryByRole('link', { name: "Préparer l'e-mail" })).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: "Préparer l'e-mail" })).toBeDisabled()
  })
})
