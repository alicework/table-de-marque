import { describe, expect, it } from 'vitest'
import { encoderEquipe, lienEquipe, type EquipePartagee } from './format'
import { qrSvg, versionQr } from './qr'

const NOMS = [
  ['Delahaye', 'Bérénice'],
  ['Lefèvre', 'Anne-Sophie'],
  ['Nguyen', 'Thi Hoa'],
  ['Martin-Gauthier', 'Maëlle'],
  ['Rousseau', 'Noël'],
  ['Benali', 'Yanis'],
  ['Fontaine', 'Clément'],
  ['Garcia', 'Inès'],
  ['Dubois-Lacroix', 'Jean-François'],
  ['Moreau', 'Léonie'],
  ['Lambert', 'Théo'],
  ['Chevalier', 'Zoé'],
  ['Girard', 'Raphaël'],
  ['Bonnet', 'Océane'],
]

describe('QR code', () => {
  it('tient dans un QR facile à scanner (version ≤ 18) pour 14 joueurs aux noms accentués', () => {
    const equipe: EquipePartagee = {
      nom: 'SAINT DELPHIN BASKET',
      couleur: 'Vert et blanc',
      coach: { type: 'libre', nom: 'Camille Lefebvre-Ducasse' },
      joueurs: NOMS.map(([nom, prenom], i) => ({
        licence: `033_${10000101 + i * 7919}`,
        nom,
        prenom,
        civilite: i % 3 === 0 ? 'Mme' : 'M',
        numero: (i * 7) % 100,
      })),
    }
    const lien = lienEquipe(encoderEquipe(equipe), 'https://basket-ufolep33.example.org/table-de-marque/')
    expect(versionQr(lien)).toBeLessThanOrEqual(18)
  })

  it('produit un SVG', async () => {
    expect(await qrSvg('https://exemple.org/#equipe=abc')).toContain('<svg')
  })
})
