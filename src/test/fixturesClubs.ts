import type { Club, Licencie } from '../domain/club'
import { enregistrerClub, enregistrerLicencie } from '../storage/clubs'

export const CLUB_TEST: Club = {
  id: 'club-sd',
  numeroAssociation: '033550002',
  nom: 'SAINT DELPHIN BASKET',
  couleurParDefaut: 'Vert',
}

export const LICENCIES_TEST: Licencie[] = [
  {
    id: 'lic-martin',
    clubId: 'club-sd',
    licence: '033_00000101',
    nom: 'Martin',
    prenom: 'Chloé',
    civilite: 'Mme',
    typeLicence: 'Competition',
  },
  {
    id: 'lic-durand',
    clubId: 'club-sd',
    licence: '033_00000102',
    nom: 'Durand',
    prenom: 'Léa',
    civilite: 'Mme',
    typeLicence: 'Loisirs',
  },
  {
    id: 'lic-petit',
    clubId: 'club-sd',
    licence: '033_00000103',
    nom: 'Petit',
    prenom: 'Hugo',
    civilite: 'M',
    typeLicence: 'Competition',
  },
]

export async function creerClubDeTest(): Promise<void> {
  await enregistrerClub(CLUB_TEST)
  for (const licencie of LICENCIES_TEST) await enregistrerLicencie(licencie)
}
