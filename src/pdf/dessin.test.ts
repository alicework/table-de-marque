// @vitest-environment node
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { PDFDocument } from 'pdf-lib'
import { describe, expect, it } from 'vitest'
import { calculerEtat } from '../domain/etat'
import { OFFICIELS_VIDES } from '../domain/match'
import type { JoueurMatch, Match } from '../domain/types'
import { debut, EQUIPE_A, EQUIPE_B, faute, matchDeTest, panier, tempsMort } from '../test/fixtures'
import { dessinerFeuille } from './dessin'
import { composerFeuille } from './modele'

const police = (fichier: string) => new Uint8Array(readFileSync(resolve(import.meta.dirname, 'polices', fichier)))
const POLICES = { normale: police('Manrope-Regular.ttf'), grasse: police('Manrope-Bold.ttf') }
const MAINTENANT = new Date(2026, 9, 16, 21, 5)
const SORTIE = resolve(import.meta.dirname, '../../test-results')

async function dessiner(match: Match, nomExemple?: string) {
  const octets = await dessinerFeuille(composerFeuille(match, calculerEtat(match), MAINTENANT), POLICES)
  if (nomExemple) {
    mkdirSync(SORTIE, { recursive: true })
    writeFileSync(resolve(SORTIE, nomExemple), octets)
  }
  return PDFDocument.load(octets)
}

const quatorze = (prefixe: string): JoueurMatch[] =>
  Array.from({ length: 14 }, (_, i) => ({
    id: `${prefixe}${i}`,
    numero: i,
    civilite: 'M',
    licence: `LIC-${prefixe}${i}`,
    nom: `Nom${i}`,
    prenom: `Prenom${i}`,
  }))

describe('dessinerFeuille', () => {
  it('produit une page A4 rechargeable (exemplaire écrit dans test-results/)', async () => {
    const match = matchDeTest(
      panier('A', 'a7', 2),
      panier('A', 'a4', 1),
      faute('A', 'a11'),
      tempsMort('A'),
      panier('B', 'b8', 3),
      debut('MT2'),
      panier('B', 'b5', 2),
      panier('A', 'a7', 2),
      faute('B', null),
      faute('B', 'b8'),
      debut('P1'),
      panier('A', 'a9', 3),
      ...Array.from({ length: 4 }, () => faute('A', 'a11')),
      { type: 'finMatch' },
    )
    match.officiels = { ...OFFICIELS_VIDES, arbitre: 'Camille R.', marqueur: 'Alex' }
    const doc = await dessiner(match, 'feuille-exemple.pdf')
    expect(doc.getPageCount()).toBe(1)
    const { width, height } = doc.getPage(0).getSize()
    expect([Math.round(width), Math.round(height)]).toEqual([595, 842])
    expect(doc.getTitle()).toBe('Feuille de match — ST DELPHIN – GRADIGNAN')
  })

  it('tient sur une ou deux pages avec 14 joueurs par équipe et deux prolongations', async () => {
    const match = matchDeTest(debut('MT2'), debut('P1'), debut('P2'), { type: 'finMatch' })
    match.equipes = {
      A: { ...EQUIPE_A, joueurs: quatorze('a') },
      B: { ...EQUIPE_B, joueurs: quatorze('b'), coach: null },
    }
    const doc = await dessiner(match, 'feuille-14-joueurs.pdf')
    expect(doc.getPageCount()).toBeLessThanOrEqual(2)
  })

  it('remplace les caractères hors police et tronque les textes trop longs sans lever', async () => {
    const match = matchDeTest(panier('A', 'a7', 2))
    // Copies : les fixtures EQUIPE_A / EQUIPE_B sont partagées, on ne mute jamais leurs tableaux.
    const [premier, ...autres] = EQUIPE_A.joueurs
    match.equipes = {
      A: {
        ...EQUIPE_A,
        nom: 'ESAL – Entente Sportive Audenge Lanton 🏀 section loisir du bassin',
        joueurs: [{ ...premier, nom: 'Nom-Très-Long-Composé-Avec-Beaucoup-De-Lettres', prenom: 'Prénom 🎉' }, ...autres],
      },
      B: { ...EQUIPE_B, nom: '🐉', couleur: 'Bleu ciel et blanc à rayures 🌈' },
    }
    match.lieu = 'Complexe sportif Christiane Ballion, avenue de très loin, Audenge 🏟️'
    const doc = await dessiner(match, 'feuille-caracteres.pdf')
    expect(doc.getPageCount()).toBe(1)
  })
})
