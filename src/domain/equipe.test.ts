import { describe, expect, it } from 'vitest'
import { EQUIPE_A, matchDeTest, panier } from '../test/fixtures'
import { ajouterJoueurAuMatch, changerNumero, ErreurEquipe, verifierEquipe } from './equipe'
import { calculerEtat } from './etat'
import type { EquipeMatch, JoueurMatch } from './types'

const avecJoueurs = (joueurs: JoueurMatch[]): EquipeMatch => ({ ...EQUIPE_A, joueurs, coach: null })
const j = (id: string, numero: number, civilite: JoueurMatch['civilite'] = 'Mme'): JoueurMatch => ({
  id,
  numero,
  civilite,
  nom: `Nom${id}`,
  prenom: '',
  licence: '',
})

describe('verifierEquipe', () => {
  it('accepte une équipe correcte', () => {
    expect(verifierEquipe(EQUIPE_A)).toEqual({ erreurs: [], avertissements: [] })
  })

  it('signale un n° attribué deux fois', () => {
    expect(verifierEquipe(avecJoueurs([j('x', 4), j('y', 4)])).erreurs).toEqual(['Le n°4 est attribué plusieurs fois.'])
  })

  it('refuse les n° hors de 0 à 99 ou non entiers', () => {
    const { erreurs } = verifierEquipe(avecJoueurs([j('x', Number.NaN), j('y', 100), j('z', 7.5)]))
    expect(erreurs).toHaveLength(3)
    expect(erreurs[0]).toBe('N° manquant ou invalide pour Nomx (0 à 99).')
  })

  it('refuse plus de 14 joueurs', () => {
    const joueurs = Array.from({ length: 15 }, (_, i) => j(`p${i}`, i))
    expect(verifierEquipe(avecJoueurs(joueurs)).erreurs).toContain('14 joueurs maximum (lignes de la feuille).')
  })

  it('exige un nom d’équipe, au moins un joueur et un nom par joueur', () => {
    const { erreurs } = verifierEquipe({ nom: ' ', couleur: '', joueurs: [], coach: null })
    expect(erreurs).toEqual(["Le nom de l'équipe est obligatoire.", 'Ajoutez au moins un joueur.'])
    expect(verifierEquipe(avecJoueurs([{ ...j('x', 4), nom: '' }])).erreurs).toEqual([
      'Nom manquant pour le joueur n°4.',
    ])
  })

  it('refuse un coach qui ne fait pas partie des joueurs', () => {
    const equipe: EquipeMatch = { ...EQUIPE_A, coach: { type: 'joueur', joueurId: 'inconnu' } }
    expect(verifierEquipe(equipe).erreurs).toEqual(['Le coach sélectionné ne fait pas partie des joueurs.'])
  })

  it('avertit, sans bloquer, s’il y a moins de 2 joueuses', () => {
    const resultat = verifierEquipe(avecJoueurs([j('x', 4, 'Mme'), j('y', 5, 'M'), j('z', 6, null)]))
    expect(resultat.erreurs).toEqual([])
    expect(resultat.avertissements).toEqual(['Seulement 1 joueuse : il en faut au moins 2 sur le terrain.'])
  })
})

describe('modifications en cours de match', () => {
  it('ajoute un joueur retardataire', () => {
    const match = ajouterJoueurAuMatch(matchDeTest(), 'B', {
      numero: 12,
      nom: 'Retard',
      prenom: 'Léa',
      licence: '',
      civilite: 'Mme',
    })
    expect(match.equipes.B.joueurs.map((x) => x.numero)).toEqual([5, 8, 10, 12])
  })

  it('refuse un joueur ajouté avec un n° déjà pris', () => {
    const ajout = () =>
      ajouterJoueurAuMatch(matchDeTest(), 'B', { numero: 8, nom: 'Double', prenom: '', licence: '', civilite: 'M' })
    expect(ajout).toThrow(ErreurEquipe)
    expect(ajout).toThrow('Le n°8 est attribué plusieurs fois.')
  })

  it('change un n° sans perdre les points du joueur', () => {
    const match = changerNumero(matchDeTest(panier('A', 'a7', 3)), 'A', 'a7', 21)
    expect(match.equipes.A.joueurs.find((x) => x.id === 'a7')?.numero).toBe(21)
    expect(calculerEtat(match).equipes.A.joueurs.a7.points).toBe(3)
  })

  it('refuse un changement vers un n° déjà pris', () => {
    expect(() => changerNumero(matchDeTest(), 'A', 'a7', 4)).toThrow('Le n°4 est attribué plusieurs fois.')
  })
})
