import { describe, expect, it } from 'vitest'
import { debut, matchDeTest, panier } from '../test/fixtures'
import { calculerEtat } from './etat'
import { choixFinPeriode, libellePeriode, periodeSuivante } from './periodes'

describe('périodes', () => {
  it('propose seulement la 2ème mi-temps à la fin de la 1ère', () => {
    expect(choixFinPeriode(calculerEtat(matchDeTest(panier('A', 'a7', 2))))).toEqual(['periodeSuivante'])
  })

  it('propose prolongation ou fin en cas d’égalité après la 2ème mi-temps', () => {
    const etat = calculerEtat(matchDeTest(debut('MT2'), panier('A', 'a7', 2), panier('B', 'b8', 2)))
    expect(choixFinPeriode(etat)).toEqual(['prolongation', 'finMatch'])
  })

  it('propose seulement la fin du match sans égalité', () => {
    expect(choixFinPeriode(calculerEtat(matchDeTest(debut('MT2'), panier('A', 'a7', 2))))).toEqual(['finMatch'])
  })

  it('ne propose rien quand le match est terminé', () => {
    expect(choixFinPeriode(calculerEtat(matchDeTest(debut('MT2'), { type: 'finMatch' })))).toEqual([])
  })

  it('enchaîne MT1, MT2, P1, P2', () => {
    expect(periodeSuivante('MT1')).toBe('MT2')
    expect(periodeSuivante('MT2')).toBe('P1')
    expect(periodeSuivante('P1')).toBe('P2')
  })

  it('donne des libellés lisibles', () => {
    expect(libellePeriode('MT1')).toBe('1ère mi-temps')
    expect(libellePeriode('MT2')).toBe('2ème mi-temps')
    expect(libellePeriode('P1')).toBe('Prolongation')
    expect(libellePeriode('P2')).toBe('Prolongation 2')
  })
})
