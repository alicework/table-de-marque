import { deflateSync, inflateSync, strFromU8, strToU8 } from 'fflate'
import { REGLES } from '../domain/config'
import type { Civilite } from '../domain/types'

export const VERSION_FORMAT_EQUIPE = 1
export const PARAMETRE_LIEN = 'equipe'
export const CODE_NON_RECONNU = "Code non reconnu : vérifiez qu'il a été copié en entier."
export const CODE_TROP_RECENT = "Ce code vient d'une version plus récente de l'application : mettez-la à jour."

export interface JoueurPartage {
  licence: string
  nom: string
  prenom: string
  civilite: Civilite
  numero: number | null
}

/** Le coach joueur est désigné par sa position dans `joueurs` (les ids ne voyagent pas). */
export type CoachPartage = { type: 'joueur'; index: number } | { type: 'libre'; nom: string } | null

export interface EquipePartagee {
  nom: string
  couleur: string
  joueurs: JoueurPartage[]
  coach: CoachPartage
}

export class ErreurCodeEquipe extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'ErreurCodeEquipe'
  }
}

type CiviliteCompacte = 'F' | 'H' | ''
/** [licence, nom, prénom, civilité, n° (-1 = non attribué)] */
type JoueurCompact = [string, string, string, CiviliteCompacte, number]

interface EquipeCompacte {
  v: number
  n: string
  c: string
  k: number | string | null
  j: JoueurCompact[]
}

const versCompacte = (civilite: Civilite): CiviliteCompacte => {
  if (civilite === 'Mme') return 'F'
  if (civilite === 'M') return 'H'
  return ''
}

const depuisCompacte = (civilite: CiviliteCompacte): Civilite => {
  if (civilite === 'F') return 'Mme'
  if (civilite === 'H') return 'M'
  return null
}

function versBase64Url(octets: Uint8Array): string {
  let binaire = ''
  for (const octet of octets) binaire += String.fromCharCode(octet)
  return btoa(binaire).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

function depuisBase64Url(texte: string): Uint8Array {
  const base64 = texte.replace(/-/g, '+').replace(/_/g, '/')
  const binaire = atob(base64 + '='.repeat((4 - (base64.length % 4)) % 4))
  return Uint8Array.from(binaire, (c) => c.charCodeAt(0))
}

export function encoderEquipe(equipe: EquipePartagee): string {
  let coach: EquipeCompacte['k'] = null
  if (equipe.coach?.type === 'joueur') coach = equipe.coach.index
  if (equipe.coach?.type === 'libre') coach = equipe.coach.nom
  const compacte: EquipeCompacte = {
    v: VERSION_FORMAT_EQUIPE,
    n: equipe.nom,
    c: equipe.couleur,
    k: coach,
    j: equipe.joueurs.map((j) => [j.licence, j.nom, j.prenom, versCompacte(j.civilite), j.numero ?? -1]),
  }
  return versBase64Url(deflateSync(strToU8(JSON.stringify(compacte)), { level: 9 }))
}

function estJoueurCompact(valeur: unknown): valeur is JoueurCompact {
  if (!Array.isArray(valeur) || valeur.length !== 5) return false
  const [licence, nom, prenom, civilite, numero] = valeur
  return (
    typeof licence === 'string' &&
    typeof nom === 'string' &&
    typeof prenom === 'string' &&
    (civilite === 'F' || civilite === 'H' || civilite === '') &&
    Number.isInteger(numero) &&
    (numero === -1 || (numero >= REGLES.numeroMin && numero <= REGLES.numeroMax))
  )
}

function estEquipeCompacte(valeur: unknown): valeur is EquipeCompacte {
  if (typeof valeur !== 'object' || valeur === null) return false
  const e = valeur as Partial<EquipeCompacte>
  if (e.v !== VERSION_FORMAT_EQUIPE || typeof e.n !== 'string' || typeof e.c !== 'string') return false
  if (!Array.isArray(e.j) || !e.j.every(estJoueurCompact)) return false
  if (e.k === null || typeof e.k === 'string') return true
  return typeof e.k === 'number' && Number.isInteger(e.k) && e.k >= 0 && e.k < e.j.length
}

export function decoderEquipe(code: string): EquipePartagee {
  let brut: unknown
  try {
    brut = JSON.parse(strFromU8(inflateSync(depuisBase64Url(code))))
  } catch {
    throw new ErreurCodeEquipe(CODE_NON_RECONNU)
  }
  const version = typeof brut === 'object' && brut !== null ? (brut as { v?: unknown }).v : undefined
  if (typeof version === 'number' && version > VERSION_FORMAT_EQUIPE) throw new ErreurCodeEquipe(CODE_TROP_RECENT)
  if (!estEquipeCompacte(brut)) throw new ErreurCodeEquipe(CODE_NON_RECONNU)

  let coach: CoachPartage = null
  if (typeof brut.k === 'number') coach = { type: 'joueur', index: brut.k }
  if (typeof brut.k === 'string') coach = { type: 'libre', nom: brut.k }
  return {
    nom: brut.n,
    couleur: brut.c,
    joueurs: brut.j.map(([licence, nom, prenom, civilite, numero]) => ({
      licence,
      nom,
      prenom,
      civilite: depuisCompacte(civilite),
      numero: numero === -1 ? null : numero,
    })),
    coach,
  }
}

export function lienEquipe(code: string, adresseApp: string): string {
  return `${adresseApp}#${PARAMETRE_LIEN}=${code}`
}

/** Accepte un lien complet ou le code seul, même coupé par des espaces ou des retours à la ligne. */
export function extraireCode(saisie: string): string | null {
  const texte = saisie.replace(/\s+/g, '')
  if (!texte) return null
  const dansLien = new RegExp(`[#?&]${PARAMETRE_LIEN}=([A-Za-z0-9_-]+)`).exec(texte)
  if (dansLien) return dansLien[1]
  return /^[A-Za-z0-9_-]+$/.test(texte) ? texte : null
}

export function lireCodeEquipe(saisie: string): EquipePartagee {
  const code = extraireCode(saisie)
  if (code === null) throw new ErreurCodeEquipe(CODE_NON_RECONNU)
  return decoderEquipe(code)
}
