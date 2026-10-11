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

const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_'

/** Même somme de contrôle que le format : FNV-1a 32 bits, ajoutée en 4 octets big-endian après le contenu compressé. */
function forger(objet: unknown): string {
  const json = strToU8(JSON.stringify(objet))
  let hash = 0x811c9dc5
  for (const octet of json) hash = Math.imul(hash ^ octet, 0x01000193) >>> 0
  const compresse = deflateSync(json)
  const octets = new Uint8Array(compresse.length + 4)
  octets.set(compresse)
  new DataView(octets.buffer).setUint32(compresse.length, hash)
  return base64Url(octets)
}

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
    const forge = forger
    expect(() => decoderEquipe(forge({ v: 1, n: 'X', c: '', k: 5, j: [] }))).toThrow(CODE_NON_RECONNU)
    expect(() => decoderEquipe(forge({ v: 1, n: 'X', c: '', k: null, j: [['', 'A', 'B', 'Z', 4]] }))).toThrow(
      CODE_NON_RECONNU,
    )
    expect(() => decoderEquipe(forge({ v: 1, n: 'X', c: '', k: null, j: [['', 'A', 'B', 'F', 100]] }))).toThrow(
      CODE_NON_RECONNU,
    )
  })

  it('refuse un code de plus de 4 000 caractères, sans le décoder', () => {
    let graine = 12345
    const aleatoire = Array.from({ length: 5000 }, () => {
      graine = (Math.imul(graine, 1103515245) + 12345) >>> 0
      return ALPHABET[(graine >>> 16) % ALPHABET.length]
    }).join('')
    const long = forger({ v: 1, n: aleatoire, c: '', k: null, j: [] })
    expect(long.length).toBeGreaterThan(4000)
    expect(() => decoderEquipe(long)).toThrow(CODE_NON_RECONNU)
    expect(() => lireCodeEquipe(long)).toThrow(CODE_NON_RECONNU)
  })

  it('refuse une équipe de plus de 14 joueurs, même avec une somme de contrôle valide', () => {
    const joueur = (numero: number) => ['', 'A', 'B', 'F', numero]
    const quatorze = Array.from({ length: 14 }, (_, i) => joueur(i))
    expect(decoderEquipe(forger({ v: 1, n: 'X', c: '', k: null, j: quatorze })).joueurs).toHaveLength(14)
    expect(() => decoderEquipe(forger({ v: 1, n: 'X', c: '', k: null, j: [...quatorze, joueur(14)] }))).toThrow(
      CODE_NON_RECONNU,
    )
  })

  it('refuse un code dont un caractère a été modifié', () => {
    const code = encoderEquipe(EQUIPE)
    for (let i = 0; i < code.length; i++) {
      // On inverse le bit de poids fort du caractère : il compte toujours, même pour le dernier caractère.
      const remplacant = ALPHABET[ALPHABET.indexOf(code[i]) ^ 32]
      const abime = code.slice(0, i) + remplacant + code.slice(i + 1)
      expect(() => decoderEquipe(abime), `position ${i}`).toThrow(ErreurCodeEquipe)
    }
  })

  it('refuse un code sans somme de contrôle', () => {
    expect(() => decoderEquipe(base64Url(deflateSync(strToU8('{"v":1}'))))).toThrow(CODE_NON_RECONNU)
    expect(() => decoderEquipe('AAAA')).toThrow(CODE_NON_RECONNU)
  })

  it("demande une mise à jour pour un code d'une version plus récente", () => {
    const code = forger({ v: 2, n: 'X', c: '', k: null, j: [] })
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

  it('extrait un code seul entouré de guillemets, de ponctuation ou d’un libellé', () => {
    expect(extraireCode(`"${code}"`)).toBe(code)
    expect(extraireCode(`« ${code} »`)).toBe(code)
    expect(extraireCode(`${code}.`)).toBe(code)
    expect(extraireCode(`Code : ${code}`)).toBe(code)
    expect(lireCodeEquipe(`Code : ${code}`)).toEqual(EQUIPE)
    expect(lireCodeEquipe(`« ${code.slice(0, 20)}\n${code.slice(20)} »`)).toEqual(EQUIPE)
  })

  it('refuse un texte sans code', () => {
    expect(() => lireCodeEquipe('Bonjour, voici la composition de notre équipe !')).toThrow(CODE_NON_RECONNU)
    expect(() => lireCodeEquipe('Notre équipe : https://exemple.org/table/ Merci')).toThrow(CODE_NON_RECONNU)
  })

  it('extrait le code d’un lien suivi de texte', () => {
    expect(extraireCode(`${lien}\nMerci à vous !`)).toBe(code)
    expect(extraireCode(`Notre équipe : ${lien} Merci`)).toBe(code)
  })

  it('extrait le code d’un lien coupé par un retour à la ligne', () => {
    const coupe = `${lien.slice(0, 40)}\n${lien.slice(40)}`
    expect(extraireCode(coupe)).toBe(code)
  })

  it('lit directement un lien collé, et explique un échec', () => {
    expect(lireCodeEquipe(lien)).toEqual(EQUIPE)
    expect(() => lireCodeEquipe('Voici notre équipe !')).toThrow(CODE_NON_RECONNU)
  })
})
