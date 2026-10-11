import type { ImportClub } from '../domain/club'
import type { Civilite } from '../domain/types'

export class ErreurExport extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'ErreurExport'
  }
}

export interface ResultatLecture {
  clubs: ImportClub[]
  lignesIgnorees: number
}

const COLONNES = {
  licence: 'n adherent',
  nom: 'nom',
  prenom: 'prenom',
  civilite: 'civilite',
  numeroAssociation: 'n association',
  nomAssociation: 'nom association',
  typeLicence: 'type licence',
} as const

type Colonne = keyof typeof COLONNES

const LIBELLES: Record<Colonne, string> = {
  licence: 'N° Adherent',
  nom: 'Nom',
  prenom: 'Prénom',
  civilite: 'Civilite',
  numeroAssociation: 'N° Association',
  nomAssociation: 'Nom association',
  typeLicence: 'Type licence',
}

const OBLIGATOIRES: Colonne[] = ['licence', 'nom', 'prenom', 'civilite', 'numeroAssociation', 'nomAssociation']

/** Webaffiligue exporte en ISO-8859-1 (windows-1252 en est un sur-ensemble) ; Excel peut ré-enregistrer en UTF-8. */
export function decoderOctets(octets: Uint8Array): string {
  if (octets[0] === 0xef && octets[1] === 0xbb && octets[2] === 0xbf) {
    return new TextDecoder('utf-8').decode(octets.subarray(3))
  }
  try {
    return new TextDecoder('utf-8', { fatal: true }).decode(octets)
  } catch {
    return new TextDecoder('windows-1252').decode(octets)
  }
}

export function decouperCsv(texte: string, separateur: string): string[][] {
  const lignes: string[][] = []
  let ligne: string[] = []
  let champ = ''
  let entreGuillemets = false

  for (let i = 0; i < texte.length; i++) {
    const caractere = texte[i]
    if (entreGuillemets) {
      if (caractere !== '"') {
        champ += caractere
      } else if (texte[i + 1] === '"') {
        champ += '"'
        i++
      } else {
        entreGuillemets = false
      }
    } else if (caractere === '"') {
      entreGuillemets = true
    } else if (caractere === separateur) {
      ligne.push(champ)
      champ = ''
    } else if (caractere === '\n' || caractere === '\r') {
      if (caractere === '\r' && texte[i + 1] === '\n') i++
      ligne.push(champ)
      lignes.push(ligne)
      ligne = []
      champ = ''
    } else {
      champ += caractere
    }
  }
  if (champ !== '' || ligne.length > 0) {
    ligne.push(champ)
    lignes.push(ligne)
  }
  return lignes.filter((cellules) => cellules.some((cellule) => cellule.trim() !== ''))
}

export function nettoyerValeur(brute: string): string {
  const valeur = brute.trim()
  const formule = /^="(.*)"$/s.exec(valeur)
  return (formule ? formule[1] : valeur).trim()
}

export function normaliserEntete(entete: string): string {
  return entete
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[°º]/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
}

function lireCivilite(valeur: string): Civilite {
  const normalisee = valeur.toLowerCase()
  if (normalisee === 'm' || normalisee === 'mr' || normalisee === 'monsieur') return 'M'
  if (normalisee === 'mme' || normalisee === 'mlle' || normalisee === 'madame') return 'Mme'
  return null
}

export function lireExportWebaffiligue(octets: Uint8Array): ResultatLecture {
  const texte = decoderOctets(octets)
  const premiereLigne = texte.split(/\r?\n/, 1)[0] ?? ''
  const separateur = premiereLigne.split(';').length >= premiereLigne.split(',').length ? ';' : ','
  const lignes = decouperCsv(texte, separateur)
  if (lignes.length === 0) throw new ErreurExport('Fichier vide.')

  const entetes = lignes[0].map((entete) => normaliserEntete(nettoyerValeur(entete)))
  const index = {} as Record<Colonne, number>
  const manquantes: string[] = []
  for (const colonne of Object.keys(COLONNES) as Colonne[]) {
    index[colonne] = entetes.indexOf(COLONNES[colonne])
    if (index[colonne] === -1 && OBLIGATOIRES.includes(colonne)) manquantes.push(LIBELLES[colonne])
  }
  if (manquantes.length > 0) {
    throw new ErreurExport(
      `Ce fichier n'est pas un export Webaffiligue reconnu : colonnes absentes (${manquantes.join(', ')}).`,
    )
  }

  const parAssociation = new Map<string, ImportClub>()
  let lignesIgnorees = 0
  for (const cellules of lignes.slice(1)) {
    const valeur = (colonne: Colonne) => (index[colonne] === -1 ? '' : nettoyerValeur(cellules[index[colonne]] ?? ''))
    const licence = valeur('licence')
    if (!licence) {
      lignesIgnorees++
      continue
    }
    const numeroAssociation = valeur('numeroAssociation')
    let club = parAssociation.get(numeroAssociation)
    if (!club) {
      club = { numeroAssociation, nom: valeur('nomAssociation'), licencies: [] }
      parAssociation.set(numeroAssociation, club)
    }
    club.licencies.push({
      licence,
      nom: valeur('nom'),
      prenom: valeur('prenom'),
      civilite: lireCivilite(valeur('civilite')),
      typeLicence: valeur('typeLicence'),
    })
  }
  if (parAssociation.size === 0) throw new ErreurExport('Aucun licencié trouvé dans ce fichier.')

  return { clubs: [...parAssociation.values()], lignesIgnorees }
}
