import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { calculerEtat } from '../../domain/etat'
import { matchDeTest } from '../../test/fixtures'

const OCTETS = new Uint8Array([37, 80, 68, 70])

/** Le module garde en cache le préchargement : chaque test repart d'une instance neuve. */
type ModuleFeuille = typeof import('./feuille')
let feuille: ModuleFeuille
beforeEach(async () => {
  vi.resetModules()
  feuille = await import('./feuille')
})
const enregistrerFichier: ModuleFeuille['enregistrerFichier'] = (...args) => feuille.enregistrerFichier(...args)
const genererFeuillePdf: ModuleFeuille['genererFeuillePdf'] = (...args) => feuille.genererFeuillePdf(...args)
const prechargerFeuille: ModuleFeuille['prechargerFeuille'] = () => feuille.prechargerFeuille()

function simulerTelechargement() {
  const creer = vi.fn((_fichier: Blob | MediaSource) => 'blob:feuille')
  const revoquer = vi.fn((_url: string) => undefined)
  Object.assign(URL, { createObjectURL: creer, revokeObjectURL: revoquer })
  const clic = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => undefined)
  return { creer, revoquer, clic }
}

function simulerPartage(share: (donnees: ShareData) => Promise<void>) {
  const canShare = vi.fn(() => true)
  Object.defineProperty(navigator, 'canShare', { value: canShare, configurable: true })
  Object.defineProperty(navigator, 'share', { value: vi.fn(share), configurable: true })
  return { canShare, share: navigator.share as ReturnType<typeof vi.fn> }
}

afterEach(() => {
  Reflect.deleteProperty(URL, 'createObjectURL')
  Reflect.deleteProperty(URL, 'revokeObjectURL')
  Reflect.deleteProperty(navigator, 'canShare')
  Reflect.deleteProperty(navigator, 'share')
  vi.unstubAllGlobals()
  vi.useRealTimers()
})

describe('enregistrerFichier', () => {
  it('télécharge quand l’appareil ne sait pas partager', async () => {
    vi.useFakeTimers()
    const { creer, revoquer, clic } = simulerTelechargement()
    await enregistrerFichier(OCTETS, 'feuille.pdf')
    expect(creer).toHaveBeenCalledTimes(1)
    const fichier = creer.mock.calls[0][0] as File
    expect(fichier.name).toBe('feuille.pdf')
    expect(fichier.type).toBe('application/pdf')
    expect(clic).toHaveBeenCalledTimes(1)
    expect(revoquer).not.toHaveBeenCalled()
    vi.runAllTimers()
    expect(revoquer).toHaveBeenCalledWith('blob:feuille')
  })

  it('partage quand l’appareil accepte le fichier', async () => {
    const { creer, clic } = simulerTelechargement()
    const { canShare, share } = simulerPartage(async () => undefined)
    await enregistrerFichier(OCTETS, 'feuille.pdf')
    expect(canShare).toHaveBeenCalledWith({ files: [expect.any(File)] })
    expect(share).toHaveBeenCalledWith({ files: [expect.any(File)], title: 'feuille.pdf' })
    expect(creer).not.toHaveBeenCalled()
    expect(clic).not.toHaveBeenCalled()
  })

  it('ne fait rien si le menu de partage est fermé sans choix', async () => {
    const { clic } = simulerTelechargement()
    simulerPartage(() => Promise.reject(new DOMException('Annulé', 'AbortError')))
    await expect(enregistrerFichier(OCTETS, 'feuille.pdf')).resolves.toBeUndefined()
    expect(clic).not.toHaveBeenCalled()
  })

  it('se replie sur le téléchargement si le partage échoue', async () => {
    const { clic } = simulerTelechargement()
    simulerPartage(() => Promise.reject(new Error('Partage refusé')))
    await expect(enregistrerFichier(OCTETS, 'feuille.pdf')).resolves.toBeUndefined()
    expect(clic).toHaveBeenCalledTimes(1)
  })
})

describe('genererFeuillePdf', () => {
  it('charge les polices et produit un PDF', async () => {
    const police = (fichier: string) => readFileSync(resolve(import.meta.dirname, '../../pdf/polices', fichier))
    vi.stubGlobal(
      'fetch',
      vi.fn(async (url: string) => new Response(police(url.includes('Bold') ? 'Manrope-Bold.ttf' : 'Manrope-Regular.ttf'))),
    )
    const match = matchDeTest()
    const octets = await genererFeuillePdf(match, calculerEtat(match))
    expect(new TextDecoder().decode(octets.subarray(0, 4))).toBe('%PDF')
    expect(fetch).toHaveBeenCalledTimes(2)
  })

  it('signale une police introuvable', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response(null, { status: 404 })))
    const match = matchDeTest()
    await expect(genererFeuillePdf(match, calculerEtat(match))).rejects.toThrow(/Police introuvable/)
  })
})

describe('prechargerFeuille', () => {
  it('charge le module et les polices une seule fois, réutilisés par la génération', async () => {
    const police = (fichier: string) => readFileSync(resolve(import.meta.dirname, '../../pdf/polices', fichier))
    vi.stubGlobal(
      'fetch',
      vi.fn(async (url: string) => new Response(police(url.includes('Bold') ? 'Manrope-Bold.ttf' : 'Manrope-Regular.ttf'))),
    )
    await prechargerFeuille()
    await prechargerFeuille()
    const match = matchDeTest()
    const octets = await genererFeuillePdf(match, calculerEtat(match))
    expect(new TextDecoder().decode(octets.subarray(0, 4))).toBe('%PDF')
    expect(fetch).toHaveBeenCalledTimes(2)
  })

  it('un préchargement en échec ne bloque pas une nouvelle tentative', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response(null, { status: 404 })))
    await expect(prechargerFeuille()).rejects.toThrow(/Police introuvable/)
    const police = (fichier: string) => readFileSync(resolve(import.meta.dirname, '../../pdf/polices', fichier))
    vi.stubGlobal(
      'fetch',
      vi.fn(async (url: string) => new Response(police(url.includes('Bold') ? 'Manrope-Bold.ttf' : 'Manrope-Regular.ttf'))),
    )
    const match = matchDeTest()
    const octets = await genererFeuillePdf(match, calculerEtat(match))
    expect(new TextDecoder().decode(octets.subarray(0, 4))).toBe('%PDF')
  })
})
