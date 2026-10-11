import { deflateSync, strToU8 } from 'fflate'
import { describe, expect, it } from 'vitest'
import {
  CODE_NON_RECONNU,
  CODE_TROP_RECENT,
  decoderEquipe,
  encoderEquipe,
  ErreurCodeEquipe,
  extraireCode,
  lienEquipe,
  lireCodeEquipe,
  type EquipePartagee,
} from './format'

const EQUIPE: EquipePartagee = {
  nom: 'SAINT DELPHIN BASKET',
  couleur: 'Vert',
  joueurs: [
    { licence: '033_1', nom: 'Lefèvre', prenom: 'Bérénice', civilite: 'Mme', numero: 4 },
    { licence: '', nom: 'Noël', prenom: 'Raphaël', civilite: 'M', numero: null },
    { licence: '033_3', nom: 'Petit', prenom: '', civilite: null, numero: 0 },
  ],
  coach: { type: 'joueur', index: 1 },
}

const base64Url = (octets: Uint8Array) =>
  btoa(String.fromCharCode(...octets)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')

describe('encodage d’une équipe', () => {
  it('fait un aller-retour sans perte (accents, n° absent, coach)', () => {
    expect(decoderEquipe(encoderEquipe(EQUIPE))).toEqual(EQUIPE)
    expect(decoderEquipe(encoderEquipe({ ...EQUIPE, coach: { type: 'libre', nom: 'Morgan F.' } })).coach).toEqual({
      type: 'libre',
      nom: 'Morgan F.',
    })
    expect(decoderEquipe(encoderEquipe({ ...EQUIPE, coach: null })).coach).toBeNull()
  })

  it('produit un code utilisable dans une URL', () => {
    expect(encoderEquipe(EQUIPE)).toMatch(/^[A-Za-z0-9_-]+$/)
  })

  it('refuse un code tronqué ou quelconque', () => {
    const code = encoderEquipe(EQUIPE)
    expect(() => decoderEquipe(code.slice(0, -6))).toThrow(ErreurCodeEquipe)
    expect(() => decoderEquipe('bonjour')).toThrow(CODE_NON_RECONNU)
  })

  it('refuse un contenu valide en apparence mais mal formé', () => {
    const forge = (objet: unknown) => base64Url(deflateSync(strToU8(JSON.stringify(objet))))
    expect(() => decoderEquipe(forge({ v: 1, n: 'X', c: '', k: 5, j: [] }))).toThrow(CODE_NON_RECONNU)
    expect(() => decoderEquipe(forge({ v: 1, n: 'X', c: '', k: null, j: [['', 'A', 'B', 'Z', 4]] }))).toThrow(
      CODE_NON_RECONNU,
    )
    expect(() => decoderEquipe(forge({ v: 1, n: 'X', c: '', k: null, j: [['', 'A', 'B', 'F', 100]] }))).toThrow(
      CODE_NON_RECONNU,
    )
  })

  it("demande une mise à jour pour un code d'une version plus récente", () => {
    const code = base64Url(deflateSync(strToU8(JSON.stringify({ v: 2, n: 'X', c: '', k: null, j: [] }))))
    expect(() => decoderEquipe(code)).toThrow(CODE_TROP_RECENT)
  })
})

describe('liens et saisie tolérante', () => {
  const code = encoderEquipe(EQUIPE)
  const lien = lienEquipe(code, 'https://exemple.org/table/')

  it('place le code dans le fragment du lien', () => {
    expect(lien).toBe(`https://exemple.org/table/#equipe=${code}`)
  })

  it('extrait le code d’un lien, d’un code seul, ou d’un texte coupé par des retours à la ligne', () => {
    expect(extraireCode(lien)).toBe(code)
    expect(extraireCode(`  ${code}\n`)).toBe(code)
    expect(extraireCode(`${code.slice(0, 20)}\n${code.slice(20)}`)).toBe(code)
    expect(extraireCode('Voici notre équipe !')).toBeNull()
    expect(extraireCode('   ')).toBeNull()
  })

  it('lit directement un lien collé, et explique un échec', () => {
    expect(lireCodeEquipe(lien)).toEqual(EQUIPE)
    expect(() => lireCodeEquipe('Voici notre équipe !')).toThrow(CODE_NON_RECONNU)
  })
})
