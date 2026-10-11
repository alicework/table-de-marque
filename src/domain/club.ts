import { nouvelId } from './match'
import type { Civilite } from './types'

export interface Club {
  id: string
  /** Identifiant Webaffiligue, sert à retrouver le club lors d'un réimport. */
  numeroAssociation: string | null
  nom: string
  couleurParDefaut: string
}

export interface Licencie {
  id: string
  clubId: string
  /** Vide pour un essai ou une licence en cours. */
  licence: string
  civilite: Civilite
  nom: string
  prenom: string
  typeLicence: string
}

/** Licencié tel que lu dans un export, avant rattachement à un club. */
export type LicencieLu = Omit<Licencie, 'id' | 'clubId'>

export interface ImportClub {
  numeroAssociation: string
  nom: string
  licencies: LicencieLu[]
}

export interface BilanFusion {
  aAjouter: Licencie[]
  aMettreAJour: Licencie[]
  inchanges: number
}

function identiques(a: Licencie, b: Licencie): boolean {
  return a.nom === b.nom && a.prenom === b.prenom && a.civilite === b.civilite && a.typeLicence === b.typeLicence
}

export function fusionnerLicencies(clubId: string, existants: Licencie[], lus: LicencieLu[]): BilanFusion {
  const parLicence = new Map(existants.map((licencie) => [licencie.licence, licencie]))
  const vus = new Set<string>()
  const aAjouter: Licencie[] = []
  const aMettreAJour: Licencie[] = []
  let inchanges = 0

  for (const lu of lus) {
    if (vus.has(lu.licence)) continue
    vus.add(lu.licence)
    const connu = parLicence.get(lu.licence)
    if (!connu) {
      aAjouter.push({ ...lu, id: nouvelId(), clubId })
      continue
    }
    // Un export partiel ou anonymisé ne doit pas effacer ce qu'on sait déjà.
    const fusionne: Licencie = {
      ...connu,
      nom: lu.nom || connu.nom,
      prenom: lu.prenom || connu.prenom,
      civilite: lu.civilite ?? connu.civilite,
      typeLicence: lu.typeLicence || connu.typeLicence,
    }
    if (identiques(connu, fusionne)) {
      inchanges++
    } else {
      aMettreAJour.push(fusionne)
    }
  }

  return { aAjouter, aMettreAJour, inchanges }
}

export function trierLicencies(licencies: Licencie[]): Licencie[] {
  return [...licencies].sort(
    (a, b) =>
      a.nom.localeCompare(b.nom, 'fr') || a.prenom.localeCompare(b.prenom, 'fr') || a.licence.localeCompare(b.licence),
  )
}

export function libelleLicencie(licencie: Pick<Licencie, 'nom' | 'prenom' | 'licence'>): string {
  return [licencie.prenom, licencie.nom].filter(Boolean).join(' ') || licencie.licence
}
