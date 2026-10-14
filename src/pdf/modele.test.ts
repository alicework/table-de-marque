import { describe, expect, it } from 'vitest'
import { calculerEtat } from '../domain/etat'
import { OFFICIELS_VIDES } from '../domain/match'
import type { Match } from '../domain/types'
import { debut, EQUIPE_A, EQUIPE_B, faute, matchDeTest, panier, tempsMort } from '../test/fixtures'
import { composerFeuille, mentionProlongation, nomJoueur } from './modele'

const MAINTENANT = new Date(2026, 9, 16, 21, 5)

/** MT1 : 3–3 ; MT2 : 5–5 ; prolongation : 8–5. */
function matchReference(): Match {
  return matchDeTest(
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
    tempsMort('B'),
    tempsMort('B'),
    debut('P1'),
    panier('A', 'a9', 3),
    faute('A', 'a11'),
    { type: 'finMatch' },
  )
}

const composer = (match: Match) => composerFeuille(match, calculerEtat(match), MAINTENANT)

describe('composerFeuille — en-tête et score', () => {
  it('titre, saison, date, lieu, score et mention', () => {
    const modele = composer(matchReference())
    expect(modele.titre).toBe('Feuille de match')
    expect(modele.sousTitre).toBe('Basket loisir UFOLEP 33 · Saison 2026-2027')
    expect(modele.date).toBe('vendredi 16 octobre 2026')
    expect(modele.lieu).toBe('Villenave-d’Ornon')
    expect(modele.score).toEqual({
      nomA: 'ST DELPHIN',
      nomB: 'GRADIGNAN',
      scoreA: 8,
      scoreB: 5,
      mention: 'après prolongation',
    })
    expect(modele.piedDePage).toBe('Généré par Table de marque le 16/10/2026 à 21:05')
  })

  it('sans date valide, pas de saison ni de date', () => {
    const modele = composer({ ...matchDeTest(), date: '' })
    expect(modele.sousTitre).toBe('Basket loisir UFOLEP 33')
    expect(modele.date).toBe('')
  })

  it('mention de prolongation selon leur nombre', () => {
    expect(mentionProlongation(calculerEtat(matchDeTest()))).toBeNull()
    expect(mentionProlongation(calculerEtat(matchDeTest(debut('MT2'), debut('P1'))))).toBe('après prolongation')
    expect(mentionProlongation(calculerEtat(matchDeTest(debut('MT2'), debut('P1'), debut('P2'))))).toBe(
      'après 2 prolongations',
    )
  })
})

describe('composerFeuille — périodes', () => {
  it('une colonne par période jouée puis le total', () => {
    const { periodes } = composer(matchReference())
    expect(periodes.colonnes).toEqual(['1ère mi-temps', '2ème mi-temps', 'Prolongation', 'Total'])
    expect(periodes.lignes).toEqual([
      { equipe: 'A', nom: 'ST DELPHIN', points: [3, 2, 3, 8], fautesEquipe: [1, 0, 1], tempsMorts: [1, 0, 0] },
      { equipe: 'B', nom: 'GRADIGNAN', points: [3, 2, 0, 5], fautesEquipe: [0, 2, 0], tempsMorts: [0, 2, 0] },
    ])
  })

  it('un match sans événement n’a que la 1ère mi-temps', () => {
    const { periodes } = composer(matchDeTest())
    expect(periodes.colonnes).toEqual(['1ère mi-temps', 'Total'])
    expect(periodes.lignes[0].points).toEqual([0, 0])
  })
})

describe('composerFeuille — équipes', () => {
  it('joueurs triés par n° avec leurs points et fautes', () => {
    const { equipes } = composer(matchReference())
    expect(equipes.A.joueurs.map((j) => j.numero)).toEqual([4, 7, 9, 11, 15])
    expect(equipes.A.joueurs[0]).toEqual({
      numero: 4,
      nom: 'Prenoma4 NOMA4',
      licence: 'LIC-a4',
      lf: 1,
      deuxPts: 0,
      troisPts: 0,
      points: 1,
      fautes: 0,
      exclu: false,
    })
    expect(equipes.A.joueurs[1]).toMatchObject({ numero: 7, deuxPts: 2, points: 4 })
    expect(equipes.A.joueurs[2]).toMatchObject({ numero: 9, troisPts: 1, points: 3 })
    expect(equipes.A.joueurs[3]).toMatchObject({ numero: 11, fautes: 2, exclu: false })
  })

  it('coach joueur, coach libre et fautes du coach', () => {
    const { equipes } = composer(matchReference())
    expect(equipes.A).toMatchObject({
      equipe: 'A',
      nom: 'ST DELPHIN',
      couleur: 'Vert',
      coach: 'n°7 Prenoma7 NOMA7',
      fautesCoach: 0,
    })
    expect(equipes.B).toMatchObject({ equipe: 'B', nom: 'GRADIGNAN', couleur: 'Noir', coach: 'Morgan F.', fautesCoach: 1 })
  })

  it('sans coach, ou coach libre au nom vide', () => {
    // Copies : EQUIPE_A et EQUIPE_B sont partagées par tous les tests, ne jamais les muter.
    const match = matchDeTest()
    match.equipes = { A: { ...EQUIPE_A, coach: null }, B: { ...EQUIPE_B, coach: { type: 'libre', nom: '  ' } } }
    const { equipes } = composer(match)
    expect(equipes.A.coach).toBeNull()
    expect(equipes.B.coach).toBeNull()
  })

  it('marque l’exclusion à 5 fautes', () => {
    const { equipes } = composer(matchDeTest(...Array.from({ length: 5 }, () => faute('A', 'a11'))))
    expect(equipes.A.joueurs[3]).toMatchObject({ numero: 11, fautes: 5, exclu: true })
  })

  it('nom du joueur : prénom puis NOM, ou « — »', () => {
    expect(nomJoueur({ prenom: 'Camille', nom: 'Dupont' })).toBe('Camille DUPONT')
    expect(nomJoueur({ prenom: '', nom: 'Dupont' })).toBe('DUPONT')
    expect(nomJoueur({ prenom: 'Camille', nom: '' })).toBe('Camille')
    expect(nomJoueur({ prenom: ' ', nom: '' })).toBe('—')
  })

  it('garde 14 joueurs', () => {
    const joueurs = Array.from({ length: 14 }, (_, i) => ({ ...EQUIPE_A.joueurs[0], id: `x${i}`, numero: 20 + i }))
    const match = matchDeTest()
    match.equipes = { A: { ...EQUIPE_A, joueurs, coach: null }, B: EQUIPE_B }
    expect(composer(match).equipes.A.joueurs).toHaveLength(14)
  })
})

describe('composerFeuille — officiels', () => {
  it('sept cases dans l’ordre de la feuille, vides par défaut', () => {
    const { officiels } = composer(matchDeTest())
    expect(officiels.map((o) => o.libelle)).toEqual([
      'Chronométreur',
      'Opérateur 30"',
      'Marqueur',
      'Arbitre',
      'Aide arbitre',
      'Capitaine A (ST DELPHIN)',
      'Capitaine B (GRADIGNAN)',
    ])
    expect(officiels.every((o) => o.valeur === '')).toBe(true)
  })

  it('reprend les valeurs saisies', () => {
    const match = { ...matchDeTest(), officiels: { ...OFFICIELS_VIDES, arbitre: 'Camille R.', capitaineB: 'Alex' } }
    const { officiels } = composer(match)
    expect(officiels[3]).toEqual({ libelle: 'Arbitre', valeur: 'Camille R.' })
    expect(officiels[6]).toEqual({ libelle: 'Capitaine B (GRADIGNAN)', valeur: 'Alex' })
  })
})
