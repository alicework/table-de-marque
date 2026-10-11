import { describe, expect, it } from 'vitest'
import { debut, faute, matchDeTest, panier, tempsMort } from '../test/fixtures'
import { aujourdhui, decrireEvenement, pastillesFautes, pluriel } from './format'

describe('format', () => {
  it('accorde au pluriel', () => {
    expect(pluriel(0, 'point')).toBe('0 point')
    expect(pluriel(1, 'faute')).toBe('1 faute')
    expect(pluriel(2, 'faute')).toBe('2 fautes')
  })

  it('dessine les pastilles de fautes', () => {
    expect(pastillesFautes(0)).toBe('○○○○○')
    expect(pastillesFautes(2)).toBe('●●○○○')
    expect(pastillesFautes(7)).toBe('●●●●●')
  })

  it('décrit chaque type d’action', () => {
    const match = matchDeTest(
      panier('A', 'a7', 2),
      faute('B', 'b8'),
      faute('A', null),
      tempsMort('B'),
      debut('MT2'),
      { type: 'finMatch' },
    )
    expect(match.evenements.map((e) => decrireEvenement(match, e))).toEqual([
      '+2 n°7 ST DELPHIN',
      'Faute n°8 GRADIGNAN',
      'Faute coach ST DELPHIN',
      'Temps mort GRADIGNAN',
      'Début : 2ème mi-temps',
      'Fin du match',
    ])
  })

  it('formate la date du jour en heure locale', () => {
    expect(aujourdhui(new Date(2026, 9, 5, 23, 30))).toBe('2026-10-05')
  })
})
