import { describe, expect, it } from 'vitest'
import { CLUB_TEST, LICENCIES_TEST } from '../../test/fixturesClubs'
import {
  appliquerSelection,
  brouillonVersEquipe,
  brouillonVersPartage,
  brouillonVide,
  choisirClub,
  joueurBrouillonVide,
  lireNumero,
  partageVersBrouillon,
  type BrouillonEquipe,
} from './brouillon'

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
      { id: 'x', licencieId: null, numero: '7', nom: ' Durand ', prenom: 'Chloé', licence: '033_1', civilite: 'Mme' },
      { id: 'vide', licencieId: null, numero: '', nom: '', prenom: '', licence: '', civilite: null },
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

  it("ignore un coach qui n'est plus dans les joueurs retenus", () => {
    const retire = { ...brouillon, modeCoach: 'joueur' as const, coachJoueurId: 'retire' }
    expect(brouillonVersEquipe(retire).coach).toBeNull()
    const ligneVidee = { ...brouillon, modeCoach: 'joueur' as const, coachJoueurId: 'vide' }
    expect(brouillonVersEquipe(ligneVidee).coach).toBeNull()
  })
})

describe('sélection dans le pool', () => {
  const [martin, durand, petit] = LICENCIES_TEST

  it('pré-remplit le nom et la couleur depuis le club sans écraser une saisie', () => {
    expect(choisirClub(brouillonVide(), CLUB_TEST)).toMatchObject({
      clubId: 'club-sd',
      nom: 'SAINT DELPHIN BASKET',
      couleur: 'Vert',
    })
    expect(choisirClub({ ...brouillonVide(), nom: 'SD 2' }, CLUB_TEST).nom).toBe('SD 2')
    expect(choisirClub(choisirClub(brouillonVide(), CLUB_TEST), null).clubId).toBeNull()
  })

  it('ajoute une ligne par licencié choisi et retire la ligne vide de départ', () => {
    const b = appliquerSelection(brouillonVide(), LICENCIES_TEST, new Set([martin.id, petit.id]))
    expect(b.joueurs.map((j) => [j.licencieId, j.nom, j.prenom, j.licence, j.civilite, j.numero])).toEqual([
      ['lic-martin', 'Martin', 'Chloé', '033_00000101', 'Mme', ''],
      ['lic-petit', 'Petit', 'Hugo', '033_00000103', 'M', ''],
    ])
  })

  it('garde les n° déjà saisis et les lignes saisies à la main', () => {
    let b = appliquerSelection(brouillonVide(), LICENCIES_TEST, new Set([martin.id]))
    b = { ...b, joueurs: [...b.joueurs.map((j) => ({ ...j, numero: '7' })), { ...joueurBrouillonVide(), nom: 'Essai', numero: '30' }] }
    b = appliquerSelection(b, LICENCIES_TEST, new Set([martin.id, durand.id]))
    expect(b.joueurs.map((j) => [j.nom, j.numero])).toEqual([
      ['Martin', '7'],
      ['Essai', '30'],
      ['Durand', ''],
    ])
  })

  it('décocher retire la ligne, garde les autres n° et remet le coach à « aucun »', () => {
    let b = appliquerSelection(brouillonVide(), LICENCIES_TEST, new Set([martin.id, durand.id]))
    b = { ...b, joueurs: b.joueurs.map((j, i) => ({ ...j, numero: String(4 + i) })) }
    const idLigneDurand = b.joueurs.find((j) => j.licencieId === durand.id)!.id
    b = { ...b, modeCoach: 'joueur', coachJoueurId: idLigneDurand }
    b = appliquerSelection(b, LICENCIES_TEST, new Set([martin.id]))
    expect(b.joueurs.map((j) => [j.nom, j.numero])).toEqual([['Martin', '4']])
    expect(brouillonVersEquipe({ ...b, nom: 'SD' }).coach).toBeNull()
    expect(b.modeCoach).toBe('aucun')
    expect(b.coachJoueurId).toBe('')
  })

  describe('changement de club', () => {
    const CLUB_B = { id: 'club-b', numeroAssociation: null, nom: 'AUDENGE', couleurParDefaut: 'Blanc' }

    function equipeDuClubA(): BrouillonEquipe {
      let b = choisirClub(brouillonVide(), CLUB_TEST)
      b = appliquerSelection(b, LICENCIES_TEST, new Set([martin.id, durand.id]))
      return { ...b, joueurs: [...b.joueurs, { ...joueurBrouillonVide(), nom: 'Essai', numero: '30' }] }
    }

    it("changer de club retire les joueurs de l'ancien club et reprend son nom et sa couleur", () => {
      const b = choisirClub(equipeDuClubA(), CLUB_B, CLUB_TEST)
      expect(b).toMatchObject({ clubId: 'club-b', nom: 'AUDENGE', couleur: 'Blanc' })
      expect(b.joueurs.map((j) => j.nom)).toEqual(['Essai'])
    })

    it('garde un nom saisi à la main en changeant de club', () => {
      const b = choisirClub({ ...equipeDuClubA(), nom: 'SD 2', couleur: 'Rouge' }, CLUB_B, CLUB_TEST)
      expect(b).toMatchObject({ clubId: 'club-b', nom: 'SD 2', couleur: 'Rouge' })
    })

    it('rechoisir le même club ne change rien', () => {
      const avant = equipeDuClubA()
      expect(choisirClub(avant, CLUB_TEST, CLUB_TEST)).toEqual(avant)
    })

    it('garde une ligne vide si plus aucune ligne ne reste', () => {
      const b = appliquerSelection(choisirClub(brouillonVide(), CLUB_TEST), LICENCIES_TEST, new Set([martin.id]))
      const apres = choisirClub(b, CLUB_B, CLUB_TEST)
      expect(apres.joueurs).toHaveLength(1)
      expect(apres.joueurs[0]).toMatchObject({ licencieId: null, nom: '' })
    })
  })
})

describe('conversion pour le partage', () => {
  it('convertit un brouillon : n° vides ou invalides → null, coach par position, lignes vides ignorées', () => {
    const b: BrouillonEquipe = {
      ...brouillonVide(),
      nom: ' SD ',
      couleur: 'Vert',
      joueurs: [
        { id: 'x', licencieId: null, numero: '07', nom: 'Martin', prenom: 'Chloé', licence: '033_1', civilite: 'Mme' },
        { id: 'vide', licencieId: null, numero: '', nom: '', prenom: '', licence: '', civilite: null },
        { id: 'y', licencieId: 'lic', numero: 'abc', nom: 'Petit', prenom: 'Hugo', licence: '', civilite: 'M' },
      ],
      modeCoach: 'joueur',
      coachJoueurId: 'y',
    }
    expect(brouillonVersPartage(b)).toEqual({
      nom: 'SD',
      couleur: 'Vert',
      joueurs: [
        { licence: '033_1', nom: 'Martin', prenom: 'Chloé', civilite: 'Mme', numero: 7 },
        { licence: '', nom: 'Petit', prenom: 'Hugo', civilite: 'M', numero: null },
      ],
      coach: { type: 'joueur', index: 1 },
    })
  })

  it('reconstruit un brouillon prêt à compléter', () => {
    const b = partageVersBrouillon({
      nom: 'GRADIGNAN',
      couleur: 'Noir',
      joueurs: [
        { licence: '033_5', nom: 'Bernard', prenom: 'Jade', civilite: 'Mme', numero: 5 },
        { licence: '033_8', nom: 'Moreau', prenom: 'Sam', civilite: 'M', numero: null },
      ],
      coach: { type: 'joueur', index: 0 },
    })
    expect(b.clubId).toBeNull()
    expect(b.joueurs.map((j) => [j.numero, j.nom, j.licencieId])).toEqual([
      ['5', 'Bernard', null],
      ['', 'Moreau', null],
    ])
    expect(b.modeCoach).toBe('joueur')
    expect(b.coachJoueurId).toBe(b.joueurs[0].id)
    expect(partageVersBrouillon({ nom: 'X', couleur: '', joueurs: [], coach: { type: 'libre', nom: 'Max' } })).toMatchObject({
      modeCoach: 'libre',
      coachNomLibre: 'Max',
    })
  })
})
