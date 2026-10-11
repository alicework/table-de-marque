import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { MiseAJour } from './MiseAJour'

const pwa = vi.hoisted(() => ({ besoin: true, mettreAJour: vi.fn(async () => {}) }))

vi.mock('virtual:pwa-register/react', () => ({
  useRegisterSW: () => ({
    needRefresh: [pwa.besoin, () => {}],
    offlineReady: [false, () => {}],
    updateServiceWorker: pwa.mettreAJour,
  }),
}))

describe('MiseAJour', () => {
  it('propose de recharger quand une version attend et qu’aucun match n’est en cours', async () => {
    const user = userEvent.setup()
    render(<MiseAJour autorisee />)
    expect(screen.getByText('Nouvelle version disponible')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Recharger' }))
    expect(pwa.mettreAJour).toHaveBeenCalledWith(true)
  })

  it('ne dit rien pendant un match', () => {
    render(<MiseAJour autorisee={false} />)
    expect(screen.queryByText('Nouvelle version disponible')).not.toBeInTheDocument()
  })
})
