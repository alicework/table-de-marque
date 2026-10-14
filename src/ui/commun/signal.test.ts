import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const importer = () => import('./signal')

/** Contexte audio minimal : enregistre les oscillateurs démarrés. */
function fauxContexte(etat: 'running' | 'suspended' = 'running') {
  const creer = vi.fn()
  const demarrer = vi.fn()
  const reprendre = vi.fn(() => Promise.resolve())
  class FauxAudioContext {
    constructor() {
      creer()
    }
    state = etat
    currentTime = 0
    destination = {}
    resume = reprendre
    createOscillator() {
      return { frequency: { value: 0 }, connect: (noeud: unknown) => noeud, start: demarrer, stop: vi.fn() }
    }
    createGain() {
      return { gain: { value: 0 }, connect: (noeud: unknown) => noeud }
    }
  }
  vi.stubGlobal('AudioContext', FauxAudioContext)
  return { creer, demarrer, reprendre }
}

describe('signal', () => {
  let vibrer: ReturnType<typeof vi.fn>

  beforeEach(() => {
    vi.resetModules()
    vibrer = vi.fn(() => true)
    Object.defineProperty(navigator, 'vibrate', { value: vibrer, configurable: true })
  })

  afterEach(() => {
    vi.unstubAllGlobals()
    Reflect.deleteProperty(navigator, 'vibrate')
  })

  it('ne lève rien sans Web Audio ni vibration', async () => {
    Reflect.deleteProperty(navigator, 'vibrate')
    const { preparerSon, emettreSignal } = await importer()
    expect(() => {
      preparerSon()
      emettreSignal()
    }).not.toThrow()
  })

  it('joue un bip et fait vibrer une fois le son préparé', async () => {
    const { demarrer } = fauxContexte()
    const { preparerSon, emettreSignal } = await importer()
    preparerSon()
    emettreSignal()
    expect(demarrer).toHaveBeenCalledTimes(1)
    expect(vibrer).toHaveBeenCalledWith([200, 100, 200])
  })

  it('fait vibrer sans jouer de son si le son n’a pas été préparé', async () => {
    const { demarrer } = fauxContexte()
    const { emettreSignal } = await importer()
    emettreSignal()
    expect(demarrer).not.toHaveBeenCalled()
    expect(vibrer).toHaveBeenCalledTimes(1)
  })

  it('relance un contexte audio suspendu au moment du geste', async () => {
    const { reprendre } = fauxContexte('suspended')
    const { preparerSon } = await importer()
    preparerSon()
    expect(reprendre).toHaveBeenCalledTimes(1)
  })

  it('ne crée qu’un seul contexte audio', async () => {
    const { creer } = fauxContexte()
    const { preparerSon } = await importer()
    preparerSon()
    preparerSon()
    expect(creer).toHaveBeenCalledTimes(1)
  })
})
