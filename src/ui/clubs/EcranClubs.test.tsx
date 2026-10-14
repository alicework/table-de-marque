import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { db } from '../../storage/db'
import { creerClubDeTest } from '../../test/fixturesClubs'
import { MESSAGE_ERREUR_STOCKAGE } from '../useMatch'
import { EcranClubs } from './EcranClubs'

async function afficher() {
  const user = userEvent.setup()
  render(<EcranClubs onRetour={vi.fn()} />)
  await screen.findByRole('heading', { name: 'Clubs et licenciés' })
  return user
}

async function ouvrirClubDeTest(user: ReturnType<typeof userEvent.setup>) {
  await user.click(await screen.findByRole('button', { name: /SAINT DELPHIN BASKET/ }))
  await screen.findByRole('heading', { name: 'SAINT DELPHIN BASKET' })
}

describe('EcranClubs', () => {
  it('crée un club', async () => {
    const user = await afficher()
    expect(await screen.findByText(/Aucun club pour l'instant/)).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Nouveau club' }))
    const dialogue = within(screen.getByRole('dialog', { name: 'Nouveau club' }))
    await user.type(dialogue.getByLabelText('Nom du club'), 'ST DELPHIN')
    await user.type(dialogue.getByLabelText('Couleur par défaut'), 'Vert')
    await user.click(dialogue.getByRole('button', { name: 'Enregistrer' }))
    expect(await screen.findByRole('button', { name: /ST DELPHIN.*0 licencié/ })).toBeInTheDocument()
  })

  it("propose le lien direct vers l'extraction des adhérents LiguAsso", async () => {
    await afficher()
    expect(screen.getByText(/type de sortie « Sortie simple Ufolep »/)).toBeInTheDocument()
    const lien = screen.getByRole('link', { name: /Ouvrir l'extraction des adhérents/ })
    expect(lien).toHaveAttribute('href', 'https://www.liguasso.org/LAPOOL5/Pages/Private/Extractions/AdhExtract.aspx')
    expect(lien).toHaveAttribute('target', '_blank')
    expect(lien).toHaveAttribute('rel', 'noopener noreferrer')
  })

  it('refuse un club sans nom', async () => {
    const user = await afficher()
    await user.click(screen.getByRole('button', { name: 'Nouveau club' }))
    await user.click(screen.getByRole('button', { name: 'Enregistrer' }))
    expect(screen.getByRole('alert')).toHaveTextContent('Le nom du club est obligatoire.')
  })

  it('affiche les licenciés d’un club, triés par nom', async () => {
    await creerClubDeTest()
    const user = await afficher()
    expect(await screen.findByRole('button', { name: /SAINT DELPHIN BASKET.*3 licenciés/ })).toBeInTheDocument()
    await ouvrirClubDeTest(user)
    const lignes = within(await screen.findByRole('list', { name: 'Licenciés' })).getAllByRole('listitem')
    expect(lignes.map((l) => l.textContent)).toEqual([
      expect.stringContaining('Léa Durand'),
      expect.stringContaining('Chloé Martin'),
      expect.stringContaining('Hugo Petit'),
    ])
  })

  it('ajoute, modifie puis supprime un licencié', async () => {
    await creerClubDeTest()
    const user = await afficher()
    await ouvrirClubDeTest(user)

    await user.click(screen.getByRole('button', { name: 'Ajouter un licencié' }))
    let dialogue = within(screen.getByRole('dialog', { name: 'Nouveau licencié' }))
    await user.type(dialogue.getByLabelText('Licence'), '033_9')
    await user.type(dialogue.getByLabelText('Nom'), 'Roux')
    await user.type(dialogue.getByLabelText('Prénom'), 'Inès')
    await user.selectOptions(dialogue.getByLabelText('Civilité'), 'Mme')
    await user.click(dialogue.getByRole('button', { name: 'Enregistrer' }))
    expect(await screen.findByText('Inès Roux')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Modifier Inès Roux' }))
    dialogue = within(screen.getByRole('dialog', { name: 'Modifier le licencié' }))
    await user.clear(dialogue.getByLabelText('Nom'))
    await user.type(dialogue.getByLabelText('Nom'), 'Roux-Martin')
    await user.click(dialogue.getByRole('button', { name: 'Enregistrer' }))
    expect(await screen.findByText('Inès Roux-Martin')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Supprimer Inès Roux-Martin' }))
    await user.click(within(screen.getByRole('dialog', { name: 'Supprimer ce licencié ?' })).getByRole('button', { name: 'Supprimer' }))
    await waitFor(() => expect(screen.queryByText('Inès Roux-Martin')).not.toBeInTheDocument())
  })

  it('signale un n° de licence déjà présent', async () => {
    await creerClubDeTest()
    const user = await afficher()
    await ouvrirClubDeTest(user)
    await user.click(screen.getByRole('button', { name: 'Ajouter un licencié' }))
    const dialogue = within(screen.getByRole('dialog', { name: 'Nouveau licencié' }))
    await user.type(dialogue.getByLabelText('Licence'), '033_00000101')
    await user.type(dialogue.getByLabelText('Nom'), 'Doublon')
    await user.click(dialogue.getByRole('button', { name: 'Enregistrer' }))
    expect(await dialogue.findByRole('alert')).toHaveTextContent('Ce n° de licence existe déjà dans ce club.')
  })

  it('exige un nom pour un licencié', async () => {
    await creerClubDeTest()
    const user = await afficher()
    await ouvrirClubDeTest(user)
    await user.click(screen.getByRole('button', { name: 'Ajouter un licencié' }))
    await user.click(screen.getByRole('button', { name: 'Enregistrer' }))
    expect(screen.getByRole('alert')).toHaveTextContent('Le nom est obligatoire.')
  })

  it('supprime un club et ses licenciés après confirmation', async () => {
    await creerClubDeTest()
    const user = await afficher()
    await ouvrirClubDeTest(user)
    await user.click(screen.getByRole('button', { name: 'Supprimer le club' }))
    const dialogue = within(screen.getByRole('dialog', { name: 'Supprimer le club ?' }))
    expect(dialogue.getByText(/Ses 3 licenciés seront aussi supprimés/)).toBeInTheDocument()
    await user.click(dialogue.getByRole('button', { name: 'Supprimer' }))
    expect(await screen.findByText(/Aucun club pour l'instant/)).toBeInTheDocument()
    expect(await db.licencies.count()).toBe(0)
  })

  it("signale un échec d'enregistrement d'un licencié", async () => {
    await creerClubDeTest()
    const user = await afficher()
    await ouvrirClubDeTest(user)
    await user.click(screen.getByRole('button', { name: 'Ajouter un licencié' }))
    const dialogue = within(screen.getByRole('dialog', { name: 'Nouveau licencié' }))
    await user.type(dialogue.getByLabelText('Nom'), 'Roux')
    vi.spyOn(db.licencies, 'put').mockRejectedValueOnce(new Error('QuotaExceededError'))
    await user.click(dialogue.getByRole('button', { name: 'Enregistrer' }))
    expect(await dialogue.findByRole('alert')).toHaveTextContent(MESSAGE_ERREUR_STOCKAGE)
    expect(screen.getByRole('dialog', { name: 'Nouveau licencié' })).toBeInTheDocument()
  })

  it("signale un échec de suppression d'un licencié", async () => {
    await creerClubDeTest()
    const user = await afficher()
    await ouvrirClubDeTest(user)
    await user.click(screen.getByRole('button', { name: 'Supprimer Léa Durand' }))
    const dialogue = within(screen.getByRole('dialog', { name: 'Supprimer ce licencié ?' }))
    vi.spyOn(db.licencies, 'delete').mockRejectedValueOnce(new Error('QuotaExceededError'))
    await user.click(dialogue.getByRole('button', { name: 'Supprimer' }))
    expect(await dialogue.findByRole('alert')).toHaveTextContent(MESSAGE_ERREUR_STOCKAGE)
    expect(screen.getByText('Léa Durand', { selector: 'span' })).toBeInTheDocument()
  })

  it("signale un échec de suppression d'un club", async () => {
    await creerClubDeTest()
    const user = await afficher()
    await ouvrirClubDeTest(user)
    await user.click(screen.getByRole('button', { name: 'Supprimer le club' }))
    const dialogue = within(screen.getByRole('dialog', { name: 'Supprimer le club ?' }))
    vi.spyOn(db.clubs, 'delete').mockRejectedValueOnce(new Error('QuotaExceededError'))
    await user.click(dialogue.getByRole('button', { name: 'Supprimer' }))
    expect(await dialogue.findByRole('alert')).toHaveTextContent(MESSAGE_ERREUR_STOCKAGE)
    expect(await db.clubs.count()).toBe(1)
  })
})
