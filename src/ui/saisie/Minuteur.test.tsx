import { act, fireEvent, render, screen } from '@testing-library/react'
import { StrictMode } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { emettreSignal } from '../commun/signal'
import { Minuteur } from './Minuteur'

vi.mock('../commun/signal', () => ({ emettreSignal: vi.fn(), preparerSon: vi.fn() }))

const DEPART = new Date('2026-10-16T19:00:00Z').getTime()
const temps = () => screen.getByRole('timer', { name: 'Temps restant' })
const avancer = (ms: number) =>
  act(() => {
    vi.advanceTimersByTime(ms)
  })

describe('Minuteur', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(DEPART)
    vi.mocked(emettreSignal).mockClear()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('affiche la durée complète puis décompte', () => {
    render(<Minuteur titre="Temps mort — ST DELPHIN" fin={DEPART + 60_000} onFermer={vi.fn()} />)
    expect(screen.getByRole('dialog', { name: 'Temps mort — ST DELPHIN' })).toBeInTheDocument()
    expect(temps()).toHaveTextContent('1:00')
    avancer(1_000)
    expect(temps()).toHaveTextContent('0:59')
    avancer(49_000)
    expect(temps()).toHaveTextContent('0:10')
    expect(emettreSignal).not.toHaveBeenCalled()
  })

  it('reste sur 0:00 et ne signale qu’une fois', () => {
    render(<Minuteur titre="Temps mort — ST DELPHIN" fin={DEPART + 60_000} onFermer={vi.fn()} />)
    avancer(60_000)
    expect(temps()).toHaveTextContent('0:00')
    expect(temps()).toHaveClass('minuteur-termine')
    avancer(30_000)
    expect(temps()).toHaveTextContent('0:00')
    expect(emettreSignal).toHaveBeenCalledTimes(1)
  })

  it('saute directement à 0:00 après une longue absence', () => {
    render(<Minuteur titre="Mi-temps" fin={DEPART + 600_000} onFermer={vi.fn()} />)
    expect(temps()).toHaveTextContent('10:00')
    // Téléphone verrouillé : l'horloge avance de 11 min, un seul tick est rattrapé au retour.
    vi.setSystemTime(DEPART + 660_000)
    avancer(250)
    expect(temps()).toHaveTextContent('0:00')
    expect(emettreSignal).toHaveBeenCalledTimes(1)
  })

  it('ne signale qu’une fois en mode strict', () => {
    // Échéance déjà passée au montage : le mode strict joue alors deux fois l'effet du signal.
    render(
      <StrictMode>
        <Minuteur titre="Mi-temps" fin={DEPART - 1_000} onFermer={vi.fn()} />
      </StrictMode>,
    )
    expect(temps()).toHaveTextContent('0:00')
    expect(emettreSignal).toHaveBeenCalledTimes(1)
  })

  describe('écran allumé', () => {
    function fauxVerrou() {
      const liberer = vi.fn(() => Promise.resolve())
      const demander = vi.fn(() => Promise.resolve({ release: liberer }))
      Object.defineProperty(navigator, 'wakeLock', { value: { request: demander }, configurable: true })
      return { demander, liberer }
    }
    const reglerPromesses = () => act(async () => {})

    afterEach(() => {
      Reflect.deleteProperty(navigator, 'wakeLock')
    })

    it('empêche la veille tant que la popup est ouverte', async () => {
      const { demander, liberer } = fauxVerrou()
      const { unmount } = render(<Minuteur titre="Mi-temps" fin={DEPART + 600_000} onFermer={vi.fn()} />)
      await reglerPromesses()
      expect(demander).toHaveBeenCalledWith('screen')
      expect(liberer).not.toHaveBeenCalled()
      unmount()
      expect(liberer).toHaveBeenCalledTimes(1)
    })

    it('redemande le verrou au retour au premier plan', async () => {
      const { demander } = fauxVerrou()
      render(<Minuteur titre="Mi-temps" fin={DEPART + 600_000} onFermer={vi.fn()} />)
      await reglerPromesses()
      act(() => {
        document.dispatchEvent(new Event('visibilitychange'))
      })
      await reglerPromesses()
      expect(demander).toHaveBeenCalledTimes(2)
    })
  })

  it('se ferme sur « Fermer », même avant la fin', () => {
    const onFermer = vi.fn()
    render(<Minuteur titre="Avant la prolongation" fin={DEPART + 120_000} onFermer={onFermer} />)
    expect(temps()).toHaveTextContent('2:00')
    fireEvent.click(screen.getByRole('button', { name: 'Fermer' }))
    expect(onFermer).toHaveBeenCalledTimes(1)
  })
})
