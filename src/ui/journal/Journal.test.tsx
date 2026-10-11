import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import type { NouvelEvenement } from '../../domain/types'
import { enregistrerMatch } from '../../storage/matchs'
import { matchDeTest, panier } from '../../test/fixtures'
import { EcranMatch } from '../saisie/EcranMatch'

async function ouvrirJournal(...evenements: NouvelEvenement[]) {
  const match = await enregistrerMatch(matchDeTest(...evenements))
  const user = userEvent.setup()
  render(<EcranMatch matchId={match.id} onAccueil={vi.fn()} />)
  await user.click(await screen.findByRole('button', { name: 'Journal' }))
  await screen.findByRole('heading', { name: 'Journal' })
  return user
}

const lignes = () => within(screen.getByRole('list', { name: 'Actions du match' })).queryAllByRole('listitem')

async function revenirAuScore(user: ReturnType<typeof userEvent.setup>, texte: string) {
  await user.click(screen.getByRole('button', { name: 'Retour au match' }))
  await waitFor(() => expect(screen.getByLabelText('Score')).toHaveTextContent(texte))
}

describe('Journal', () => {
  it('liste les actions, la plus récente en premier, avec le score après chacune', async () => {
    await ouvrirJournal(panier('A', 'a7', 2), panier('B', 'b8', 3))
    expect(lignes()[0]).toHaveTextContent('2–3')
    expect(lignes()[0]).toHaveTextContent('+3 n°8 GRADIGNAN')
    expect(lignes()[1]).toHaveTextContent('+2 n°7 ST DELPHIN')
  })

  it('corrige la valeur d’un panier', async () => {
    const user = await ouvrirJournal(panier('A', 'a7', 2))
    await user.click(screen.getByRole('button', { name: 'Modifier : +2 n°7 ST DELPHIN' }))
    const dialogue = within(screen.getByRole('dialog', { name: "Modifier l'action" }))
    await user.selectOptions(dialogue.getByLabelText('Valeur'), '3')
    await user.click(dialogue.getByRole('button', { name: 'Enregistrer' }))
    expect(await screen.findByText('+3 n°7 ST DELPHIN')).toBeInTheDocument()
    await revenirAuScore(user, '3 – 0')
  })

  it('déplacer un panier vers l’autre équipe impose de choisir un de ses joueurs', async () => {
    const user = await ouvrirJournal(panier('A', 'a7', 2))
    await user.click(screen.getByRole('button', { name: 'Modifier : +2 n°7 ST DELPHIN' }))
    const dialogue = within(screen.getByRole('dialog', { name: "Modifier l'action" }))
    await user.selectOptions(dialogue.getByLabelText('Équipe'), 'B')
    expect(dialogue.getByRole('button', { name: 'Enregistrer' })).toBeDisabled()
    await user.selectOptions(dialogue.getByLabelText('Joueur'), 'b8')
    await user.click(dialogue.getByRole('button', { name: 'Enregistrer' }))
    await revenirAuScore(user, '0 – 2')
  })

  it('supprime une action après confirmation', async () => {
    const user = await ouvrirJournal(panier('A', 'a7', 2))
    await user.click(screen.getByRole('button', { name: 'Supprimer : +2 n°7 ST DELPHIN' }))
    const dialogue = within(screen.getByRole('dialog', { name: 'Supprimer cette action ?' }))
    await user.click(dialogue.getByRole('button', { name: 'Supprimer' }))
    await waitFor(() => expect(lignes()).toHaveLength(0))
  })

  it('annule la dernière action depuis le journal', async () => {
    const user = await ouvrirJournal(panier('A', 'a7', 2), panier('B', 'b8', 3))
    await user.click(screen.getByRole('button', { name: '↶ Annuler la dernière action' }))
    await waitFor(() => expect(lignes()).toHaveLength(1))
  })

  it('refuse de changer un n° vers un n° déjà pris', async () => {
    const user = await ouvrirJournal()
    const joueurs = within(screen.getByRole('region', { name: 'Joueurs ST DELPHIN' }))
    await user.click(joueurs.getByRole('button', { name: 'Changer le n°7' }))
    const champ = screen.getByLabelText('Nouveau n°')
    await user.clear(champ)
    await user.type(champ, '4')
    await user.click(screen.getByRole('button', { name: 'Enregistrer' }))
    expect(await screen.findByRole('alert')).toHaveTextContent('Le n°4 est attribué plusieurs fois.')
  })

  it('change un n° et garde le joueur', async () => {
    const user = await ouvrirJournal()
    const joueurs = within(screen.getByRole('region', { name: 'Joueurs ST DELPHIN' }))
    await user.click(joueurs.getByRole('button', { name: 'Changer le n°7' }))
    const champ = screen.getByLabelText('Nouveau n°')
    await user.clear(champ)
    await user.type(champ, '21')
    await user.click(screen.getByRole('button', { name: 'Enregistrer' }))
    expect(await joueurs.findByRole('button', { name: 'Changer le n°21' })).toBeInTheDocument()
  })

  it('ajoute un joueur retardataire', async () => {
    const user = await ouvrirJournal()
    const joueurs = within(screen.getByRole('region', { name: 'Joueurs GRADIGNAN' }))
    await user.click(joueurs.getByRole('button', { name: 'Ajouter un joueur' }))
    const dialogue = within(screen.getByRole('dialog', { name: 'Ajouter un joueur — GRADIGNAN' }))
    await user.type(dialogue.getByLabelText('N°'), '23')
    await user.type(dialogue.getByLabelText('Nom'), 'Retard')
    await user.selectOptions(dialogue.getByLabelText('Civilité'), 'Mme')
    await user.click(dialogue.getByRole('button', { name: 'Enregistrer' }))
    expect(await joueurs.findByText('n°23 Retard')).toBeInTheDocument()
  })
})
