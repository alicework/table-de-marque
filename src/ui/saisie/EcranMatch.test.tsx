import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import type { NouvelEvenement } from '../../domain/types'
import { enregistrerMatch, lireMatch } from '../../storage/matchs'
import { faute, matchDeTest, panier } from '../../test/fixtures'
import { EcranMatch } from './EcranMatch'

async function afficher(...evenements: NouvelEvenement[]) {
  const match = await enregistrerMatch(matchDeTest(...evenements))
  const user = userEvent.setup()
  render(<EcranMatch matchId={match.id} onAccueil={vi.fn()} />)
  await screen.findByLabelText('Score')
  return { user, id: match.id }
}

const actions = (nom: string) => within(screen.getByRole('group', { name: `Actions ${nom}` }))
const attendreScore = (texte: string) =>
  waitFor(() => expect(screen.getByLabelText('Score')).toHaveTextContent(texte))

describe('EcranMatch — saisie', () => {
  it('enregistre un panier : action puis joueur', async () => {
    const { user, id } = await afficher()
    await user.click(actions('ST DELPHIN').getByRole('button', { name: '+2' }))
    expect(screen.getByRole('heading', { name: '+2 — ST DELPHIN' })).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: /^n°7,/ }))
    await attendreScore('2 – 0')
    expect(screen.getByText(/Dernière action : 2 – 0 · \+2 n°7 ST DELPHIN/)).toBeInTheDocument()
    expect((await lireMatch(id))?.evenements).toHaveLength(1)
  })

  it('montre n°, fautes et points sur des tuiles triées par n°', async () => {
    const { user } = await afficher(panier('A', 'a7', 2), faute('A', 'a7'))
    await user.click(actions('ST DELPHIN').getByRole('button', { name: 'Faute' }))
    const tuiles = screen.getAllByRole('button', { name: /^n°/ }).map((t) => t.getAttribute('aria-label'))
    expect(tuiles.slice(0, 2)).toEqual(['n°4, 0 faute, 0 point', 'n°7, 1 faute, 2 points'])
    expect(tuiles).toHaveLength(5)
  })

  it('propose la tuile Coach uniquement pour une faute', async () => {
    const { user, id } = await afficher()
    await user.click(actions('GRADIGNAN').getByRole('button', { name: '+1' }))
    expect(screen.queryByRole('button', { name: /^Coach/ })).not.toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: '✕ Annuler' }))

    await user.click(actions('GRADIGNAN').getByRole('button', { name: 'Faute' }))
    await user.click(screen.getByRole('button', { name: /^Coach/ }))
    await waitFor(async () => {
      expect((await lireMatch(id))?.evenements).toMatchObject([{ type: 'faute', equipe: 'B', joueurId: null }])
    })
  })

  it('grise un joueur à 5 fautes pour un panier mais pas pour une faute', async () => {
    const { user } = await afficher(...Array.from({ length: 5 }, () => faute('A', 'a11')))
    await user.click(actions('ST DELPHIN').getByRole('button', { name: '+2' }))
    expect(screen.getByRole('button', { name: /^n°11,/ })).toBeDisabled()
    await user.click(screen.getByRole('button', { name: '✕ Annuler' }))
    await user.click(actions('ST DELPHIN').getByRole('button', { name: 'Faute' }))
    expect(screen.getByRole('button', { name: /^n°11,/ })).toBeEnabled()
  })

  it('✕ Annuler revient à l’écran d’action sans rien enregistrer', async () => {
    const { user, id } = await afficher()
    await user.click(actions('ST DELPHIN').getByRole('button', { name: '+3' }))
    await user.click(screen.getByRole('button', { name: '✕ Annuler' }))
    expect(screen.getByLabelText('Score')).toHaveTextContent('0 – 0')
    expect((await lireMatch(id))?.evenements).toHaveLength(0)
  })

  it('un double tap sur une tuile n’enregistre qu’une action', async () => {
    const { user, id } = await afficher()
    await user.click(actions('ST DELPHIN').getByRole('button', { name: '+2' }))
    await user.dblClick(screen.getByRole('button', { name: /^n°7,/ }))
    await attendreScore('2 – 0')
    expect((await lireMatch(id))?.evenements).toHaveLength(1)
  })

  it('un tap fantôme sur l’écran d’action juste après un choix est ignoré', async () => {
    const { user, id } = await afficher()
    await user.click(actions('ST DELPHIN').getByRole('button', { name: '+2' }))
    await user.click(screen.getByRole('button', { name: /^n°7,/ }))
    await user.click(screen.getByRole('button', { name: '↶ Annuler' }))
    await user.click(actions('ST DELPHIN').getByRole('button', { name: '+3' }))
    await attendreScore('2 – 0')
    expect(screen.queryByRole('heading', { name: '+3 — ST DELPHIN' })).not.toBeInTheDocument()
    expect((await lireMatch(id))?.evenements).toHaveLength(1)
  })

  it('compte un temps mort et annule la dernière action', async () => {
    const { user } = await afficher()
    await user.click(actions('ST DELPHIN').getByRole('button', { name: 'Temps mort' }))
    await waitFor(() => expect(screen.getByLabelText('Temps morts ST DELPHIN')).toHaveTextContent('TM 1'))
    await user.click(screen.getByRole('button', { name: '↶ Annuler' }))
    await waitFor(() => expect(screen.getByLabelText('Temps morts ST DELPHIN')).toHaveTextContent('TM 0'))
  })

  it('affiche les fautes d’équipe de la période', async () => {
    await afficher(faute('B', 'b8'), faute('B', 'b5'))
    expect(screen.getByLabelText("Fautes d'équipe GRADIGNAN")).toHaveTextContent('Fautes éq. 2/8')
  })
})
