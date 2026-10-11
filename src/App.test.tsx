import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import App from './App'
import { enregistrerMatch } from './storage/matchs'
import { matchDeTest, panier } from './test/fixtures'
import { remplirEquipe } from './test/remplirEquipe'

const pwa = vi.hoisted(() => ({ besoin: false }))

vi.mock('virtual:pwa-register/react', () => ({
  useRegisterSW: () => ({
    needRefresh: [pwa.besoin, () => {}],
    offlineReady: [false, () => {}],
    updateServiceWorker: async () => {},
  }),
}))

async function revenirAlAccueil(user: ReturnType<typeof userEvent.setup>) {
  await screen.findByLabelText('Score')
  await user.click(screen.getByRole('button', { name: 'Accueil' }))
  await screen.findByRole('button', { name: /Reprendre le match en cours/ })
}

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

  it('demande confirmation avant un nouveau match quand un match est en cours', async () => {
    await enregistrerMatch(matchDeTest())
    const user = userEvent.setup()
    render(<App />)
    await revenirAlAccueil(user)
    await user.click(screen.getByRole('button', { name: 'Nouveau match' }))
    const dialogue = within(screen.getByRole('dialog', { name: 'Un match est en cours' }))
    expect(dialogue.getByText('Il restera enregistré mais ne sera plus repris automatiquement.')).toBeInTheDocument()
    await user.click(dialogue.getByRole('button', { name: 'Créer un nouveau match' }))
    expect(await screen.findByRole('heading', { name: 'Nouveau match' })).toBeInTheDocument()
  })

  it('« Annuler » garde l’accueil et le match en cours', async () => {
    await enregistrerMatch(matchDeTest())
    const user = userEvent.setup()
    render(<App />)
    await revenirAlAccueil(user)
    await user.click(screen.getByRole('button', { name: 'Nouveau match' }))
    await user.click(screen.getByRole('button', { name: 'Annuler' }))
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: 'Nouveau match' })).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Reprendre le match en cours/ })).toBeInTheDocument()
  })
})

describe('App — bandeau de mise à jour', () => {
  const bandeau = () => screen.queryByText('Nouvelle version disponible')

  beforeEach(() => {
    pwa.besoin = true
  })

  afterEach(() => {
    pwa.besoin = false
  })

  it('le propose sur l’accueil sans match en cours', async () => {
    render(<App />)
    await screen.findByRole('button', { name: 'Nouveau match' })
    expect(bandeau()).toBeInTheDocument()
  })

  it('le tait quand un match est en cours (reprise automatique)', async () => {
    await enregistrerMatch(matchDeTest())
    render(<App />)
    await screen.findByLabelText('Score')
    expect(bandeau()).not.toBeInTheDocument()
  })

  it('le tait sur l’écran de préparation, pour ne pas perdre le formulaire', async () => {
    const user = userEvent.setup()
    render(<App />)
    await user.click(await screen.findByRole('button', { name: 'Nouveau match' }))
    await screen.findByRole('heading', { name: 'Nouveau match' })
    expect(bandeau()).not.toBeInTheDocument()
  })
})
