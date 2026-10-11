import { describe, expect, it } from 'vitest'
import { brouillonVersEquipe, brouillonVide, lireNumero, type BrouillonEquipe } from './brouillon'

describe('lireNumero', () => {
  it('accepte 0 à 99, zéro initial compris', () => {
    expect(lireNumero('7')).toBe(7)
    expect(lireNumero(' 07 ')).toBe(7)
    expect(lireNumero('0')).toBe(0)
    expect(lireNumero('99')).toBe(99)
  })

  it('refuse les saisies douteuses au lieu de les transformer en 0', () => {
    for (const saisie of ['', '  ', '7.5', '-3', '100', 'sept', '1e1']) {
      expect(lireNumero(saisie)).toBeNaN()
    }
  })
})

describe('brouillonVersEquipe', () => {
  const brouillon: BrouillonEquipe = {
    ...brouillonVide(),
    nom: ' ST DELPHIN ',
    joueurs: [
      { id: 'x', numero: '7', nom: ' Durand ', prenom: 'Chloé', licence: '033_1', civilite: 'Mme' },
      { id: 'vide', numero: '', nom: '', prenom: '', licence: '', civilite: null },
    ],
  }

  it('nettoie les champs et ignore les lignes vides', () => {
    expect(brouillonVersEquipe(brouillon)).toEqual({
      nom: 'ST DELPHIN',
      couleur: '',
      joueurs: [{ id: 'x', numero: 7, nom: 'Durand', prenom: 'Chloé', licence: '033_1', civilite: 'Mme' }],
      coach: null,
    })
  })

  it('transforme le coach joueur ou libre', () => {
    expect(brouillonVersEquipe({ ...brouillon, modeCoach: 'joueur', coachJoueurId: 'x' }).coach).toEqual({
      type: 'joueur',
      joueurId: 'x',
    })
    expect(brouillonVersEquipe({ ...brouillon, modeCoach: 'libre', coachNomLibre: ' Morgan ' }).coach).toEqual({
      type: 'libre',
      nom: 'Morgan',
    })
    expect(brouillonVersEquipe({ ...brouillon, modeCoach: 'libre', coachNomLibre: '  ' }).coach).toBeNull()
  })
})
