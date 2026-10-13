import { describe, expect, it } from 'vitest'
import { debut, faute, matchDeTest } from '../test/fixtures'
import { calculerEtat } from './etat'
import { alertesActives, niveauFautesEquipe, niveauFautesJoueur } from './regles'

const fautesA = (n: number) => Array.from({ length: n }, (_, i) => faute('A', ['a4', 'a7', 'a9', 'a11'][i % 4]))

describe('règles UFOLEP', () => {
  it('classe les fautes d’équipe : attention à 7, limite à 8, pénalité dès 9', () => {
    expect(niveauFautesEquipe(0)).toBe('normal')
    expect(niveauFautesEquipe(6)).toBe('normal')
    expect(niveauFautesEquipe(7)).toBe('attention')
    expect(niveauFautesEquipe(8)).toBe('limite')
    expect(niveauFautesEquipe(9)).toBe('penalite')
    expect(niveauFautesEquipe(11)).toBe('penalite')
  })

  it('classe les fautes perso : attention à 4, exclu à 5', () => {
    expect(niveauFautesJoueur(3)).toBe('normal')
    expect(niveauFautesJoueur(4)).toBe('attention')
    expect(niveauFautesJoueur(5)).toBe('exclu')
  })

  it('alerte à partir de 8 fautes d’équipe dans la période', () => {
    const match = matchDeTest(...fautesA(8))
    expect(alertesActives(match, calculerEtat(match))).toEqual([
      { cle: 'fautes-equipe-A', message: "ST DELPHIN : 8 fautes d'équipe — au-delà de 8, 2 lancers francs" },
    ])
  })

  it('n’alerte plus après le passage en prolongation', () => {
    const match = matchDeTest(debut('MT2'), ...fautesA(8), debut('P1'))
    expect(alertesActives(match, calculerEtat(match))).toEqual([])
  })

  it('alerte quand un joueur atteint 5 fautes', () => {
    const match = matchDeTest(...Array.from({ length: 5 }, () => faute('A', 'a11')))
    expect(alertesActives(match, calculerEtat(match))).toEqual([
      { cle: 'exclu-a11', message: 'ST DELPHIN : n°11 a 5 fautes, doit sortir' },
    ])
  })
})
