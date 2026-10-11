import {
  fusionnerLicencies,
  trierLicencies,
  type BilanFusion,
  type Club,
  type ImportClub,
  type Licencie,
} from '../domain/club'
import { nouvelId } from '../domain/match'
import { db } from './db'

export class ErreurLicenceEnDouble extends Error {
  constructor() {
    super('Ce n° de licence existe déjà dans ce club.')
    this.name = 'ErreurLicenceEnDouble'
  }
}

const parNom = (a: Club, b: Club) => a.nom.localeCompare(b.nom, 'fr')

export async function listerClubs(): Promise<Club[]> {
  return (await db.clubs.toArray()).sort(parNom)
}

export async function listerClubsAvecEffectif(): Promise<{ club: Club; effectif: number }[]> {
  const clubs = await listerClubs()
  return Promise.all(
    clubs.map(async (club) => ({ club, effectif: await db.licencies.where('clubId').equals(club.id).count() })),
  )
}

export function lireClub(id: string): Promise<Club | undefined> {
  return db.clubs.get(id)
}

export async function enregistrerClub(club: Club): Promise<void> {
  await db.clubs.put(club)
}

export async function supprimerClub(id: string): Promise<void> {
  await db.transaction('rw', db.clubs, db.licencies, async () => {
    await db.licencies.where('clubId').equals(id).delete()
    await db.clubs.delete(id)
  })
}

export async function listerLicencies(clubId: string): Promise<Licencie[]> {
  return trierLicencies(await db.licencies.where('clubId').equals(clubId).toArray())
}

export async function enregistrerLicencie(licencie: Licencie): Promise<void> {
  await db.transaction('rw', db.licencies, async () => {
    if (licencie.licence) {
      const meme = await db.licencies.where('[clubId+licence]').equals([licencie.clubId, licencie.licence]).first()
      if (meme && meme.id !== licencie.id) throw new ErreurLicenceEnDouble()
    }
    await db.licencies.put(licencie)
  })
}

export async function supprimerLicencie(id: string): Promise<void> {
  await db.licencies.delete(id)
}

export interface BilanImportClub {
  nom: string
  nouveauClub: boolean
  ajoutes: number
  misAJour: number
  inchanges: number
}

interface PlanImport {
  club: Club
  nouveauClub: boolean
  fusion: BilanFusion
}

async function planifier(clubsLus: ImportClub[]): Promise<PlanImport[]> {
  const plans: PlanImport[] = []
  for (const lu of clubsLus) {
    const numero = lu.numeroAssociation || null
    const existant = numero ? await db.clubs.where('numeroAssociation').equals(numero).first() : undefined
    const club: Club = existant ?? {
      id: nouvelId(),
      numeroAssociation: numero,
      nom: lu.nom || 'Club sans nom',
      couleurParDefaut: '',
    }
    const licencies = existant ? await db.licencies.where('clubId').equals(club.id).toArray() : []
    plans.push({ club, nouveauClub: !existant, fusion: fusionnerLicencies(club.id, licencies, lu.licencies) })
  }
  return plans
}

const versBilan = ({ club, nouveauClub, fusion }: PlanImport): BilanImportClub => ({
  nom: club.nom,
  nouveauClub,
  ajoutes: fusion.aAjouter.length,
  misAJour: fusion.aMettreAJour.length,
  inchanges: fusion.inchanges,
})

export async function previsualiserImport(clubsLus: ImportClub[]): Promise<BilanImportClub[]> {
  return (await planifier(clubsLus)).map(versBilan)
}

export async function appliquerImport(clubsLus: ImportClub[]): Promise<BilanImportClub[]> {
  return db.transaction('rw', db.clubs, db.licencies, async () => {
    const plans = await planifier(clubsLus)
    for (const plan of plans) {
      if (plan.nouveauClub) await db.clubs.add(plan.club)
      await db.licencies.bulkAdd(plan.fusion.aAjouter)
      await db.licencies.bulkPut(plan.fusion.aMettreAJour)
    }
    return plans.map(versBilan)
  })
}
