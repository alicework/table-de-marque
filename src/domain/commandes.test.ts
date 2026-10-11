import { describe, expect, it } from 'vitest'
import { debut, faute, matchDeTest, panier } from '../test/fixtures'
import {
  annulerDernier,
  appliquerFinPeriode,
  remplacerEvenement,
  rouvrirMatch,
  supprimerEvenement,
} from './commandes'
import { calculerEtat, fautesEquipeEnCours } from './etat'

describe('opérations sur le journal', () => {
  it('annule la dernière action', () => {
    const match = annulerDernier(matchDeTest(panier('A', 'a7', 2), panier('B', 'b8', 3)))
    expect(calculerEtat(match).equipes.B.score).toBe(0)
    expect(calculerEtat(match).equipes.A.score).toBe(2)
  })

  it('ne fait rien quand le journal est vide', () => {
    const match = matchDeTest()
    expect(annulerDernier(match)).toBe(match)
  })

  it('annuler le début de la 2ème mi-temps restaure la 1ère et ses fautes d’équipe', () => {
    const match = annulerDernier(matchDeTest(faute('A', 'a11'), faute('A', 'a11'), debut('MT2')))
    const etat = calculerEtat(match)
    expect(etat.periode).toBe('MT1')
    expect(fautesEquipeEnCours(etat, 'A')).toBe(2)
  })

  it('déplace un panier vers l’autre équipe et recalcule les deux scores', () => {
    const match = matchDeTest(panier('A', 'a7', 2))
    const evenement = match.evenements[0]
    if (evenement.type !== 'panier') throw new Error('panier attendu')
    const etat = calculerEtat(remplacerEvenement(match, { ...evenement, equipe: 'B', joueurId: 'b8' }))
    expect(etat.equipes.A.score).toBe(0)
    expect(etat.equipes.B.score).toBe(2)
    expect(etat.equipes.A.joueurs.a7.points).toBe(0)
    expect(etat.equipes.B.joueurs.b8.points).toBe(2)
  })

  it('supprime une action précise', () => {
    const match = matchDeTest(panier('A', 'a7', 2), panier('A', 'a4', 3))
    expect(calculerEtat(supprimerEvenement(match, match.evenements[0].id)).equipes.A.score).toBe(3)
  })

  it('passe de la 1ère à la 2ème mi-temps', () => {
    expect(calculerEtat(appliquerFinPeriode(matchDeTest(), 'periodeSuivante')).periode).toBe('MT2')
  })

  it('lance une prolongation en cas d’égalité', () => {
    expect(calculerEtat(appliquerFinPeriode(matchDeTest(debut('MT2')), 'prolongation')).periode).toBe('P1')
  })

  it('refuse une prolongation sans égalité', () => {
    const match = matchDeTest(debut('MT2'), panier('A', 'a7', 2))
    expect(() => appliquerFinPeriode(match, 'prolongation')).toThrow('Choix impossible : prolongation')
  })

  it('refuse de terminer le match à la fin de la 1ère mi-temps', () => {
    expect(() => appliquerFinPeriode(matchDeTest(), 'finMatch')).toThrow('Choix impossible : finMatch')
  })

  it('termine puis rouvre un match', () => {
    const termine = appliquerFinPeriode(matchDeTest(debut('MT2'), panier('A', 'a7', 2)), 'finMatch')
    expect(calculerEtat(termine).termine).toBe(true)
    expect(calculerEtat(rouvrirMatch(termine)).termine).toBe(false)
  })
})
