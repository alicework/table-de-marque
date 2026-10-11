import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import App from './App'
import { enregistrerMatch } from './storage/matchs'
import { matchDeTest, panier } from './test/fixtures'
import { remplirEquipe } from './test/remplirEquipe'

describe('App', () => {
  it('ouvre l’accueil quand aucun match n’est en cours', async () => {
    render(<App />)
    expect(await screen.findByRole('button', { name: 'Nouveau match' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /Reprendre le match en cours/ })).not.toBeInTheDocument()
  })

  it('reprend automatiquement le match en cours', async () => {
    await enregistrerMatch(matchDeTest(panier('A', 'a7', 2)))
    render(<App />)
    expect(await screen.findByLabelText('Score')).toHaveTextContent('2 – 0')
  })

  it('crée un match, saisit une action, et la retrouve après un rechargement', async () => {
    const user = userEvent.setup()
    const { unmount } = render(<App />)
    await user.click(await screen.findByRole('button', { name: 'Nouveau match' }))
    await remplirEquipe(user, 'Équipe A', 'ST DELPHIN', [
      { numero: '4', nom: 'Martin', civilite: 'Mme' },
      { numero: '7', nom: 'Durand', civilite: 'Mme' },
    ])
    await remplirEquipe(user, 'Équipe B', 'GRADIGNAN', [
      { numero: '5', nom: 'Bernard', civilite: 'Mme' },
      { numero: '8', nom: 'Moreau', civilite: 'Mme' },
    ])
    await user.click(screen.getByRole('button', { name: 'Commencer le match' }))

    const actionsA = within(await screen.findByRole('group', { name: 'Actions ST DELPHIN' }))
    await user.click(actionsA.getByRole('button', { name: '+2' }))
    await user.click(screen.getByRole('button', { name: /^n°4,/ }))
    await waitFor(() => expect(screen.getByLabelText('Score')).toHaveTextContent('2 – 0'))

    unmount()
    render(<App />)
    expect(await screen.findByLabelText('Score')).toHaveTextContent('2 – 0')
  })

  it('depuis le match, l’accueil propose de le reprendre', async () => {
    await enregistrerMatch(matchDeTest())
    const user = userEvent.setup()
    render(<App />)
    await screen.findByLabelText('Score')
    await user.click(screen.getByRole('button', { name: 'Accueil' }))
    await user.click(await screen.findByRole('button', { name: /Reprendre le match en cours/ }))
    expect(await screen.findByLabelText('Score')).toBeInTheDocument()
  })
})
