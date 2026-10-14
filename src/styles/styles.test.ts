// @vitest-environment node
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

const lire = (fichier: string) => readFileSync(resolve(import.meta.dirname, fichier), 'utf8')

const JETONS = Object.fromEntries(
  [...lire('jetons.css').matchAll(/(--[\w-]+):\s*(#[0-9a-fA-F]{6})\s*;/g)].map(([, nom, valeur]) => [nom, valeur]),
)

/** Une couleur littérale (#fff, #rrggbb) ou un jeton (--nom, var(--nom)). */
function resoudre(couleur: string): string {
  const nom = couleur.match(/^(?:var\()?(--[\w-]+)\)?$/)?.[1]
  const valeur = nom ? JETONS[nom] : couleur
  if (!valeur) throw new Error(`Couleur inconnue : ${couleur}`)
  return valeur.length === 4 ? `#${[...valeur.slice(1)].map((c) => c + c).join('')}` : valeur
}

function luminance(hex: string): number {
  const [r, g, b] = [1, 3, 5].map((i) => {
    const c = parseInt(hex.slice(i, i + 2), 16) / 255
    return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4
  })
  return 0.2126 * r + 0.7152 * g + 0.0722 * b
}

function contraste(texte: string, fond: string): number {
  const [clair, sombre] = [luminance(resoudre(texte)), luminance(resoudre(fond))].sort((a, b) => b - a)
  return (clair + 0.05) / (sombre + 0.05)
}

/** Déclarations du bloc dont le sélecteur occupe seule une ligne. */
function bloc(fichier: string, selecteur: string): Record<string, string> {
  const echappe = selecteur.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const corps = lire(fichier).match(new RegExp(`^${echappe} \\{\\n([^}]*)\\}`, 'm'))?.[1]
  if (corps === undefined) throw new Error(`Bloc introuvable : ${selecteur} dans ${fichier}`)
  return Object.fromEntries([...corps.matchAll(/^\s*([\w-]+):\s*([^;]+);/gm)].map(([, prop, valeur]) => [prop, valeur]))
}

// Couples texte / fond réellement utilisés par les écrans (spec § 4.1), contraste WCAG AA.
const COUPLES: [texte: string, fond: string, usage: string][] = [
  ['--texte', '--surface', 'texte courant'],
  ['--texte', '--fond', 'texte sur la page'],
  ['--texte-2', '--surface', 'libellés'],
  ['--texte-2', '--fond', 'sous-titres'],
  ['--texte-2', '--surface-2', 'pastilles, puces, voyant neutre'],
  ['--accent-texte', '--accent-tint', 'badge de période'],
  ['#fff', '--accent', 'bouton principal'],
  ['#fff', '--danger', 'alertes, voyant pénalité, bouton danger'],
  ['--points', '--points-tint', 'boutons +1 +2 +3'],
  ['--faute', '--faute-tint', 'bouton F'],
  ['--temps-mort', '--temps-mort-tint', 'bouton Temps mort'],
  ['--attention', '--attention-tint', 'voyant à 7 fautes, avertissements'],
  ['--equipe-a', '--equipe-a-tint', 'flèche de possession, équipe A'],
  ['--equipe-b', '--equipe-b-tint', 'flèche de possession, équipe B'],
  ['--danger', '--surface', 'minuteur à 0:00'],
]

describe('styles', () => {
  it.each(COUPLES)('%s sur %s (%s) atteint 4,5:1', (texte, fond) => {
    expect(contraste(texte, fond)).toBeGreaterThanOrEqual(4.5)
  })

  it('le libellé du voyant à 8 fautes reste lisible sur son fond', () => {
    const limite = bloc('composants.css', '.fautes-bloc.niveau-limite')
    expect(contraste(limite.color, limite.background)).toBeGreaterThanOrEqual(4.5)
  })

  it('la flèche de possession offre une zone tactile d’au moins 48 px', () => {
    expect(parseInt(bloc('saisie.css', '.possession-cote')['min-height'], 10)).toBeGreaterThanOrEqual(48)
  })

  it('la pastille de période du bandeau ne s’applique pas aux autres écrans', () => {
    expect(lire('saisie.css')).not.toMatch(/^\.periode\b/m)
  })
})
