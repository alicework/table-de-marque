import { describe, expect, it } from 'vitest'
import { fusionnerLicencies, libelleLicencie, trierLicencies, type Licencie, type LicencieLu } from './club'

const existant = (licence: string, nom: string, prenom: string): Licencie => ({
  id: `id-${licence}`,
  clubId: 'c1',
  licence,
  nom,
  prenom,
  civilite: 'Mme',
  typeLicence: 'Competition',
})
const lu = (licence: string, nom: string, prenom: string, civilite: LicencieLu['civilite'] = 'Mme'): LicencieLu => ({
  licence,
  nom,
  prenom,
  civilite,
  typeLicence: 'Competition',
})

describe('fusionnerLicencies', () => {
  it('ajoute les licences inconnues au club', () => {
    const bilan = fusionnerLicencies('c1', [], [lu('033_1', 'Martin', 'Chloé')])
    expect(bilan.aAjouter).toHaveLength(1)
    expect(bilan.aAjouter[0]).toMatchObject({ clubId: 'c1', licence: '033_1', nom: 'Martin', prenom: 'Chloé' })
    expect(bilan.aAjouter[0].id).toBeTruthy()
    expect(bilan.aMettreAJour).toEqual([])
    expect(bilan.inchanges).toBe(0)
  })

  it('met à jour un licencié connu en gardant son id', () => {
    const bilan = fusionnerLicencies('c1', [existant('033_1', 'Martin', 'Chloé')], [lu('033_1', 'Martin-Roux', 'Chloé')])
    expect(bilan.aAjouter).toEqual([])
    expect(bilan.aMettreAJour).toEqual([{ ...existant('033_1', 'Martin', 'Chloé'), nom: 'Martin-Roux' }])
  })

  it('compte les licenciés inchangés', () => {
    const bilan = fusionnerLicencies('c1', [existant('033_1', 'Martin', 'Chloé')], [lu('033_1', 'Martin', 'Chloé')])
    expect(bilan).toEqual({ aAjouter: [], aMettreAJour: [], inchanges: 1 })
  })

  it("n'efface jamais un nom ou un prénom connu avec une valeur vide", () => {
    const bilan = fusionnerLicencies('c1', [existant('033_1', 'Martin', 'Chloé')], [lu('033_1', '', '', null)])
    expect(bilan).toEqual({ aAjouter: [], aMettreAJour: [], inchanges: 1 })
  })

  it('ignore les doublons de licence dans le fichier (première occurrence)', () => {
    const bilan = fusionnerLicencies('c1', [], [lu('033_1', 'Martin', 'Chloé'), lu('033_1', 'Autre', 'Nom')])
    expect(bilan.aAjouter.map((l) => l.nom)).toEqual(['Martin'])
  })
})

describe('trierLicencies et libelleLicencie', () => {
  it('trie par nom puis prénom, accents compris, sans modifier la liste reçue', () => {
    const liste = [existant('3', 'Émond', 'Zoé'), existant('1', 'Durand', 'Léa'), existant('2', 'Durand', 'Anaïs')]
    expect(trierLicencies(liste).map((l) => l.prenom)).toEqual(['Anaïs', 'Léa', 'Zoé'])
    expect(liste[0].nom).toBe('Émond')
  })

  it('affiche « Prénom Nom », ou la licence quand le nom est inconnu', () => {
    expect(libelleLicencie({ nom: 'Martin', prenom: 'Chloé', licence: '033_1' })).toBe('Chloé Martin')
    expect(libelleLicencie({ nom: '', prenom: '', licence: '033_1' })).toBe('033_1')
  })
})
