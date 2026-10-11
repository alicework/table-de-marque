import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { db } from '../../storage/db'
import { lireMatch } from '../../storage/matchs'
import { creerClubDeTest } from '../../test/fixturesClubs'
import { remplirEquipe } from '../../test/remplirEquipe'
import { PreparationMatch } from './PreparationMatch'

const EQUIPE_B = [
  { numero: '5', nom: 'Bernard', civilite: 'Mme' as const },
  { numero: '8', nom: 'Moreau', civilite: 'Mme' as const },
]

describe('PreparationMatch', () => {
  it('crée le match avec les deux équipes et le démarre', async () => {
    const user = userEvent.setup()
    const onDemarre = vi.fn()
    render(<PreparationMatch onDemarre={onDemarre} onRetour={vi.fn()} />)

    await remplirEquipe(user, 'Équipe A', 'ST DELPHIN', [
      { numero: '4', nom: 'Martin', civilite: 'Mme' },
      { numero: '7', nom: 'Durand', civilite: 'Mme' },
    ])
    const groupeA = within(screen.getByRole('group', { name: 'Équipe A' }))
    await user.selectOptions(groupeA.getByLabelText('Coach'), 'n°7 Durand')
    await remplirEquipe(user, 'Équipe B', 'GRADIGNAN', EQUIPE_B)
    await user.type(screen.getByLabelText('Lieu'), 'Villenave')
    await user.click(screen.getByRole('button', { name: 'Commencer le match' }))

    await waitFor(() => expect(onDemarre).toHaveBeenCalledTimes(1))
    const match = await lireMatch(onDemarre.mock.calls[0][0])
    expect(match?.lieu).toBe('Villenave')
    expect(match?.equipes.A.joueurs.map((j) => j.numero)).toEqual([4, 7])
    const durand = match?.equipes.A.joueurs.find((j) => j.nom === 'Durand')
    expect(match?.equipes.A.coach).toEqual({ type: 'joueur', joueurId: durand?.id })
    expect(match?.equipes.B.nom).toBe('GRADIGNAN')
  })

  it('bloque le démarrage si un n° est attribué deux fois', async () => {
    const user = userEvent.setup()
    const onDemarre = vi.fn()
    render(<PreparationMatch onDemarre={onDemarre} onRetour={vi.fn()} />)

    await remplirEquipe(user, 'Équipe A', 'ST DELPHIN', [
      { numero: '4', nom: 'Martin', civilite: 'Mme' },
      { numero: '4', nom: 'Durand', civilite: 'Mme' },
    ])
    await remplirEquipe(user, 'Équipe B', 'GRADIGNAN', EQUIPE_B)
    await user.click(screen.getByRole('button', { name: 'Commencer le match' }))

    expect(await screen.findByText('Le n°4 est attribué plusieurs fois.')).toBeInTheDocument()
    expect(onDemarre).not.toHaveBeenCalled()
  })

  it('refuse un n° vide au lieu de le prendre pour 0', async () => {
    const user = userEvent.setup()
    const onDemarre = vi.fn()
    render(<PreparationMatch onDemarre={onDemarre} onRetour={vi.fn()} />)

    const groupeA = within(screen.getByRole('group', { name: 'Équipe A' }))
    await user.type(groupeA.getByLabelText("Nom de l'équipe"), 'ST DELPHIN')
    await user.type(groupeA.getByLabelText('Nom joueur 1'), 'Martin')
    await remplirEquipe(user, 'Équipe B', 'GRADIGNAN', EQUIPE_B)
    await user.click(screen.getByRole('button', { name: 'Commencer le match' }))

    expect(await screen.findByText('N° manquant ou invalide pour Martin (0 à 99).')).toBeInTheDocument()
    expect(onDemarre).not.toHaveBeenCalled()
  })

  it('avertit s’il y a moins de 2 joueuses mais laisse démarrer', async () => {
    const user = userEvent.setup()
    const onDemarre = vi.fn()
    render(<PreparationMatch onDemarre={onDemarre} onRetour={vi.fn()} />)

    await remplirEquipe(user, 'Équipe A', 'ST DELPHIN', [
      { numero: '4', nom: 'Martin', civilite: 'Mme' },
      { numero: '7', nom: 'Durand', civilite: 'M' },
    ])
    await remplirEquipe(user, 'Équipe B', 'GRADIGNAN', EQUIPE_B)

    expect(screen.getByText('Seulement 1 joueuse : il en faut au moins 2 sur le terrain.')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Commencer le match' }))
    await waitFor(() => expect(onDemarre).toHaveBeenCalledTimes(1))
  })

  it('ne crée qu’un seul match en cas de double clic', async () => {
    const user = userEvent.setup()
    const onDemarre = vi.fn()
    render(<PreparationMatch onDemarre={onDemarre} onRetour={vi.fn()} />)

    await remplirEquipe(user, 'Équipe A', 'ST DELPHIN', [
      { numero: '4', nom: 'Martin', civilite: 'Mme' },
      { numero: '7', nom: 'Durand', civilite: 'Mme' },
    ])
    await remplirEquipe(user, 'Équipe B', 'GRADIGNAN', EQUIPE_B)
    await user.dblClick(screen.getByRole('button', { name: 'Commencer le match' }))

    await waitFor(() => expect(onDemarre).toHaveBeenCalledTimes(1))
    expect(await db.matchs.count()).toBe(1)
  })

  it("compose une équipe en choisissant dans le pool d'un club", async () => {
    await creerClubDeTest()
    const user = userEvent.setup()
    const onDemarre = vi.fn()
    render(<PreparationMatch onDemarre={onDemarre} onRetour={vi.fn()} />)

    const groupeA = within(screen.getByRole('group', { name: 'Équipe A' }))
    await user.selectOptions(await groupeA.findByLabelText('Club'), await groupeA.findByRole('option', { name: 'SAINT DELPHIN BASKET' }))
    expect(groupeA.getByLabelText("Nom de l'équipe")).toHaveValue('SAINT DELPHIN BASKET')
    expect(groupeA.getByLabelText('Couleur')).toHaveValue('Vert')

    await user.click(groupeA.getByRole('button', { name: 'Choisir les joueurs du club' }))
    const dialogue = within(screen.getByRole('dialog', { name: 'Choisir les joueurs' }))
    await user.type(dialogue.getByLabelText('Rechercher'), 'dur')
    expect(dialogue.queryByRole('checkbox', { name: /Martin/ })).not.toBeInTheDocument()
    await user.click(await dialogue.findByRole('checkbox', { name: /Léa Durand/ }))
    await user.clear(dialogue.getByLabelText('Rechercher'))
    await user.click(dialogue.getByRole('checkbox', { name: /Chloé Martin/ }))
    expect(dialogue.getByText('2 / 14 joueurs')).toBeInTheDocument()
    await user.click(dialogue.getByRole('button', { name: 'Valider' }))

    expect(groupeA.getByLabelText('Nom joueur 1')).toHaveValue('Durand')
    expect(groupeA.getByLabelText('Nom joueur 2')).toHaveValue('Martin')
    await user.type(groupeA.getByLabelText('N° joueur 1'), '4')
    await user.type(groupeA.getByLabelText('N° joueur 2'), '7')
    await remplirEquipe(user, 'Équipe B', 'GRADIGNAN', EQUIPE_B)
    await user.click(screen.getByRole('button', { name: 'Commencer le match' }))

    await waitFor(() => expect(onDemarre).toHaveBeenCalledTimes(1))
    const match = await lireMatch(onDemarre.mock.calls[0][0])
    expect(match?.equipes.A.joueurs.map((j) => [j.numero, j.licence])).toEqual([
      [4, '033_00000102'],
      [7, '033_00000101'],
    ])
  })
})
