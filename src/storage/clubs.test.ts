import { describe, expect, it } from 'vitest'
import type { ImportClub } from '../domain/club'
import { CLUB_TEST, creerClubDeTest, LICENCIES_TEST } from '../test/fixturesClubs'
import {
  appliquerImport,
  enregistrerClub,
  enregistrerLicencie,
  ErreurLicenceEnDouble,
  listerClubs,
  listerClubsAvecEffectif,
  listerLicencies,
  previsualiserImport,
  supprimerClub,
} from './clubs'
import { db } from './db'

const IMPORT: ImportClub[] = [
  {
    numeroAssociation: '033550002',
    nom: 'SAINT DELPHIN BASKET',
    licencies: [
      { licence: '033_00000101', nom: 'Martin', prenom: 'Chloé', civilite: 'Mme', typeLicence: 'Competition' },
      { licence: '033_1', nom: 'Roux', prenom: 'Inès', civilite: 'Mme', typeLicence: 'Loisirs' },
    ],
  },
]

describe('clubs et licenciés', () => {
  it('liste les clubs par nom avec leur effectif', async () => {
    await creerClubDeTest()
    await enregistrerClub({ id: 'club-a', numeroAssociation: null, nom: 'AUDENGE', couleurParDefaut: '' })
    expect((await listerClubs()).map((c) => c.nom)).toEqual(['AUDENGE', 'SAINT DELPHIN BASKET'])
    expect((await listerClubsAvecEffectif()).map((e) => e.effectif)).toEqual([0, 3])
  })

  it('liste les licenciés triés par nom', async () => {
    await creerClubDeTest()
    expect((await listerLicencies(CLUB_TEST.id)).map((l) => l.nom)).toEqual(['Durand', 'Martin', 'Petit'])
  })

  it('refuse un n° de licence déjà présent dans le club', async () => {
    await creerClubDeTest()
    const doublon = { ...LICENCIES_TEST[0], id: 'autre' }
    await expect(enregistrerLicencie(doublon)).rejects.toThrow(ErreurLicenceEnDouble)
    await expect(enregistrerLicencie(doublon)).rejects.toThrow('Ce n° de licence existe déjà dans ce club.')
  })

  it('accepte la même licence dans un autre club, une mise à jour, et plusieurs licences vides', async () => {
    await creerClubDeTest()
    await enregistrerLicencie({ ...LICENCIES_TEST[0], id: 'ailleurs', clubId: 'autre-club' })
    await enregistrerLicencie({ ...LICENCIES_TEST[0], nom: 'Martin-Roux' })
    await enregistrerLicencie({ ...LICENCIES_TEST[1], id: 'essai-1', licence: '' })
    await enregistrerLicencie({ ...LICENCIES_TEST[1], id: 'essai-2', licence: '' })
    expect(await listerLicencies(CLUB_TEST.id)).toHaveLength(5)
  })

  it('supprime un club avec ses licenciés', async () => {
    await creerClubDeTest()
    await supprimerClub(CLUB_TEST.id)
    expect(await db.clubs.count()).toBe(0)
    expect(await db.licencies.count()).toBe(0)
  })

  it("prévisualise un import sans rien écrire", async () => {
    expect(await previsualiserImport(IMPORT)).toEqual([
      { nom: 'SAINT DELPHIN BASKET', nouveauClub: true, ajoutes: 2, misAJour: 0, inchanges: 0 },
    ])
    expect(await db.clubs.count()).toBe(0)
  })

  it('applique un import : crée le club, puis un réimport ne crée aucun doublon', async () => {
    expect(await appliquerImport(IMPORT)).toEqual([
      { nom: 'SAINT DELPHIN BASKET', nouveauClub: true, ajoutes: 2, misAJour: 0, inchanges: 0 },
    ])
    expect(await appliquerImport(IMPORT)).toEqual([
      { nom: 'SAINT DELPHIN BASKET', nouveauClub: false, ajoutes: 0, misAJour: 0, inchanges: 2 },
    ])
    expect(await db.clubs.count()).toBe(1)
    expect(await db.licencies.count()).toBe(2)
  })

  it("rattache l'import au club existant par son n° d'association", async () => {
    await creerClubDeTest()
    const bilans = await appliquerImport(IMPORT)
    expect(bilans).toEqual([{ nom: 'SAINT DELPHIN BASKET', nouveauClub: false, ajoutes: 1, misAJour: 0, inchanges: 1 }])
    expect(await listerLicencies(CLUB_TEST.id)).toHaveLength(4)
  })
})
