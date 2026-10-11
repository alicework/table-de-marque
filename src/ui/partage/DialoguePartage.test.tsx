import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import App from '../../App'
import { decoderEquipe, type EquipePartagee } from '../../roster-share/format'
import { remplirEquipe } from '../../test/remplirEquipe'
import { DialoguePartage } from './DialoguePartage'

const EQUIPE: EquipePartagee = {
  nom: 'GRADIGNAN',
  couleur: 'Noir',
  joueurs: [
    { licence: '033_5', nom: 'Bernard', prenom: 'Jade', civilite: 'Mme', numero: 5 },
    { licence: '033_8', nom: 'Moreau', prenom: 'Sam', civilite: 'M', numero: null },
  ],
  coach: null,
}

describe('DialoguePartage', () => {
  it('affiche le QR code et un code qui redonne l’équipe', async () => {
    render(<DialoguePartage equipe={EQUIPE} onFermer={vi.fn()} />)
    expect(screen.getByText('GRADIGNAN — 2 joueurs')).toBeInTheDocument()
    const qr = await screen.findByRole('img', { name: "QR code de l'équipe" })
    expect(qr.innerHTML).toContain('<svg')
    const code = (screen.getByLabelText("Code de l'équipe") as HTMLTextAreaElement).value
    expect(decoderEquipe(code)).toEqual(EQUIPE)
  })

  it('copie le lien de l’équipe', async () => {
    const user = userEvent.setup()
    render(<DialoguePartage equipe={EQUIPE} onFermer={vi.fn()} />)
    await user.click(screen.getByRole('button', { name: 'Copier le lien' }))
    expect(await screen.findByRole('status')).toHaveTextContent('Lien copié.')
    expect(await navigator.clipboard.readText()).toMatch(/#equipe=[A-Za-z0-9_-]+$/)
  })

  it('propose de copier le code à la main si le presse-papiers est refusé', async () => {
    const user = userEvent.setup()
    render(<DialoguePartage equipe={EQUIPE} onFermer={vi.fn()} />)
    vi.spyOn(navigator.clipboard, 'writeText').mockRejectedValueOnce(new Error('refus'))
    await user.click(screen.getByRole('button', { name: 'Copier le code' }))
    expect(await screen.findByRole('status')).toHaveTextContent('Copie impossible : sélectionnez le code ci-dessous.')
  })
})

describe('Partager une équipe depuis l’accueil', () => {
  it('compose une équipe sans démarrer de match puis la partage', async () => {
    const user = userEvent.setup()
    render(<App />)
    await user.click(await screen.findByRole('button', { name: 'Partager une équipe' }))
    const groupe = within(screen.getByRole('group', { name: 'Équipe à partager' }))
    expect(groupe.getByRole('button', { name: 'Partager cette équipe' })).toBeDisabled()
    await remplirEquipe(user, 'Équipe à partager', 'GRADIGNAN', [
      { numero: '5', nom: 'Bernard', civilite: 'Mme' },
      { numero: '8', nom: 'Moreau', civilite: 'M' },
    ])
    await user.click(groupe.getByRole('button', { name: 'Partager cette équipe' }))
    const dialogue = within(screen.getByRole('dialog', { name: "Partager l'équipe" }))
    expect(dialogue.getByText('GRADIGNAN — 2 joueurs')).toBeInTheDocument()
  })
})
