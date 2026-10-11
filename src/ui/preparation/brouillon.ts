import type { Club, Licencie } from '../../domain/club'
import { nouvelId } from '../../domain/match'
import type { Civilite, Coach, EquipeMatch } from '../../domain/types'

export interface JoueurBrouillon {
  id: string
  /** Licencié du pool d'origine ; null pour une ligne saisie à la main. */
  licencieId: string | null
  numero: string
  nom: string
  prenom: string
  licence: string
  civilite: Civilite
}

export type ModeCoach = 'aucun' | 'joueur' | 'libre'

export interface BrouillonEquipe {
  nom: string
  couleur: string
  clubId: string | null
  joueurs: JoueurBrouillon[]
  modeCoach: ModeCoach
  coachJoueurId: string
  coachNomLibre: string
}

export function joueurBrouillonVide(): JoueurBrouillon {
  return { id: nouvelId(), licencieId: null, numero: '', nom: '', prenom: '', licence: '', civilite: null }
}

export function brouillonVide(): BrouillonEquipe {
  return {
    nom: '',
    couleur: '',
    clubId: null,
    joueurs: [joueurBrouillonVide()],
    modeCoach: 'aucun',
    coachJoueurId: '',
    coachNomLibre: '',
  }
}

/** « 07 » → 7. Tout ce qui n'est pas 1 ou 2 chiffres donne NaN (jamais un 0 silencieux). */
export function lireNumero(saisie: string): number {
  const nettoyee = saisie.trim()
  return /^\d{1,2}$/.test(nettoyee) ? Number(nettoyee) : Number.NaN
}

export function estVide(joueur: JoueurBrouillon): boolean {
  return [joueur.numero, joueur.nom, joueur.prenom, joueur.licence].every((champ) => champ.trim() === '')
}

export function brouillonVersEquipe(brouillon: BrouillonEquipe): EquipeMatch {
  const joueurs = brouillon.joueurs
    .filter((joueur) => !estVide(joueur))
    .map((joueur) => ({
      id: joueur.id,
      numero: lireNumero(joueur.numero),
      nom: joueur.nom.trim(),
      prenom: joueur.prenom.trim(),
      licence: joueur.licence.trim(),
      civilite: joueur.civilite,
    }))

  let coach: Coach = null
  if (
    brouillon.modeCoach === 'joueur' &&
    brouillon.coachJoueurId &&
    joueurs.some((joueur) => joueur.id === brouillon.coachJoueurId)
  ) {
    coach = { type: 'joueur', joueurId: brouillon.coachJoueurId }
  }
  if (brouillon.modeCoach === 'libre' && brouillon.coachNomLibre.trim()) {
    coach = { type: 'libre', nom: brouillon.coachNomLibre.trim() }
  }

  return { nom: brouillon.nom.trim(), couleur: brouillon.couleur.trim(), joueurs, coach }
}

export function choisirClub(brouillon: BrouillonEquipe, club: Club | null): BrouillonEquipe {
  if (!club) return { ...brouillon, clubId: null }
  return {
    ...brouillon,
    clubId: club.id,
    nom: brouillon.nom.trim() ? brouillon.nom : club.nom,
    couleur: brouillon.couleur.trim() ? brouillon.couleur : club.couleurParDefaut,
  }
}

/** Les lignes venues du pool suivent les cases cochées ; les lignes saisies à la main restent. */
export function appliquerSelection(
  brouillon: BrouillonEquipe,
  licencies: Licencie[],
  idsChoisis: ReadonlySet<string>,
): BrouillonEquipe {
  const gardees = brouillon.joueurs.filter(
    (joueur) => !estVide(joueur) && (joueur.licencieId === null || idsChoisis.has(joueur.licencieId)),
  )
  const presents = new Set(gardees.map((joueur) => joueur.licencieId))
  const ajoutees = licencies
    .filter((licencie) => idsChoisis.has(licencie.id) && !presents.has(licencie.id))
    .map((licencie) => ({
      id: nouvelId(),
      licencieId: licencie.id,
      numero: '',
      nom: licencie.nom,
      prenom: licencie.prenom,
      licence: licencie.licence,
      civilite: licencie.civilite,
    }))
  return { ...brouillon, joueurs: [...gardees, ...ajoutees] }
}
