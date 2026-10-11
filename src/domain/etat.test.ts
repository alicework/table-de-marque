import { describe, expect, it } from 'vitest'
import { debut, faute, matchDeTest, panier, tempsMort } from '../test/fixtures'
import { calculerEtat, fautesEquipeEnCours, tempsMortsEnCours } from './etat'

describe('calculerEtat', () => {
  it('démarre en 1ère mi-temps à 0–0', () => {
    const etat = calculerEtat(matchDeTest())
    expect(etat.periode).toBe('MT1')
    expect(etat.periodes).toEqual(['MT1'])
    expect(etat.termine).toBe(false)
    expect(etat.equipes.A.score).toBe(0)
    expect(etat.equipes.B.score).toBe(0)
  })

  it('cumule les paniers par équipe, par période et par joueur', () => {
    const etat = calculerEtat(
      matchDeTest(panier('A', 'a7', 2), panier('A', 'a7', 3), panier('B', 'b5', 1), debut('MT2'), panier('A', 'a4', 2)),
    )
    expect(etat.equipes.A.score).toBe(7)
    expect(etat.equipes.B.score).toBe(1)
    expect(etat.equipes.A.pointsParPeriode).toEqual({ MT1: 5, MT2: 2 })
    expect(etat.equipes.A.joueurs.a7).toEqual({ points: 5, lf: 0, deuxPts: 1, troisPts: 1, fautes: 0 })
    expect(etat.equipes.B.joueurs.b5.lf).toBe(1)
  })

  it('compte les fautes perso, les fautes du coach et les fautes d’équipe par période', () => {
    const etat = calculerEtat(
      matchDeTest(faute('A', 'a11'), faute('A', 'a11'), faute('A', null), debut('MT2'), faute('A', 'a11')),
    )
    expect(etat.equipes.A.joueurs.a11.fautes).toBe(3)
    expect(etat.equipes.A.fautesCoach).toBe(1)
    expect(etat.equipes.A.fautesEquipeParPeriode).toEqual({ MT1: 3, MT2: 1 })
    expect(fautesEquipeEnCours(etat, 'A')).toBe(1)
  })

  it('repart à zéro pour les fautes d’équipe en prolongation', () => {
    const etat = calculerEtat(matchDeTest(debut('MT2'), faute('B', 'b8'), faute('B', 'b8'), debut('P1'), faute('B', 'b10')))
    expect(etat.periode).toBe('P1')
    expect(etat.equipes.B.fautesEquipeParPeriode).toEqual({ MT2: 2, P1: 1 })
    expect(fautesEquipeEnCours(etat, 'B')).toBe(1)
  })

  it('compte les temps morts par période', () => {
    const etat = calculerEtat(matchDeTest(tempsMort('A'), tempsMort('A'), debut('MT2'), tempsMort('A')))
    expect(etat.equipes.A.tempsMortsParPeriode).toEqual({ MT1: 2, MT2: 1 })
    expect(tempsMortsEnCours(etat, 'A')).toBe(1)
    expect(tempsMortsEnCours(etat, 'B')).toBe(0)
  })

  it('marque la fin du match et donne le score après chaque action', () => {
    const etat = calculerEtat(matchDeTest(panier('A', 'a7', 2), panier('B', 'b8', 3), { type: 'finMatch' }))
    expect(etat.termine).toBe(true)
    expect(etat.chronologie.map((l) => [l.scoreA, l.scoreB])).toEqual([
      [2, 0],
      [2, 3],
      [2, 3],
    ])
    expect(etat.chronologie[0].periode).toBe('MT1')
  })
})
