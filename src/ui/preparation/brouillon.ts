import type { Club, Licencie } from '../../domain/club'
import { nouvelId } from '../../domain/match'
import type { Civilite, Coach, EquipeMatch } from '../../domain/types'
import type { EquipePartagee } from '../../roster-share/format'

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

/** Remet le coach à « aucun » si la ligne qui le désignait a disparu. */
function coachCoherent(brouillon: BrouillonEquipe): BrouillonEquipe {
  if (brouillon.modeCoach !== 'joueur' || brouillon.joueurs.some((joueur) => joueur.id === brouillon.coachJoueurId)) {
    return brouillon
  }
  return { ...brouillon, modeCoach: 'aucun', coachJoueurId: '' }
}

/**
 * Changer de club retire les lignes venues de l'ancien pool et remplace le nom et la couleur
 * qui étaient ceux de l'ancien club (`precedent`) ; une saisie à la main est conservée.
 * En repassant en saisie libre (`club` null), le nom et la couleur venus de l'ancien club sont vidés.
 */
export function choisirClub(
  brouillon: BrouillonEquipe,
  club: Club | null,
  precedent: Club | null = null,
): BrouillonEquipe {
  if ((club?.id ?? null) === brouillon.clubId) return brouillon
  const manuelles = brouillon.joueurs.filter((joueur) => joueur.licencieId === null)
  const sansPool = coachCoherent({
    ...brouillon,
    clubId: club?.id ?? null,
    joueurs: manuelles.length > 0 ? manuelles : [joueurBrouillonVide()],
  })
  const nomSaisi = brouillon.nom.trim() && brouillon.nom !== precedent?.nom
  const couleurSaisie = brouillon.couleur.trim() && brouillon.couleur !== precedent?.couleurParDefaut
  if (!club) {
    return {
      ...sansPool,
      nom: nomSaisi ? brouillon.nom : '',
      couleur: couleurSaisie ? brouillon.couleur : '',
    }
  }
  return {
    ...sansPool,
    nom: nomSaisi ? brouillon.nom : club.nom,
    couleur: couleurSaisie ? brouillon.couleur : club.couleurParDefaut,
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
  return coachCoherent({ ...brouillon, joueurs: [...gardees, ...ajoutees] })
}

export function brouillonVersPartage(brouillon: BrouillonEquipe): EquipePartagee {
  const lignes = brouillon.joueurs.filter((joueur) => !estVide(joueur))
  let coach: EquipePartagee['coach'] = null
  const indexCoach = lignes.findIndex((joueur) => joueur.id === brouillon.coachJoueurId)
  if (brouillon.modeCoach === 'joueur' && indexCoach !== -1) coach = { type: 'joueur', index: indexCoach }
  if (brouillon.modeCoach === 'libre' && brouillon.coachNomLibre.trim()) {
    coach = { type: 'libre', nom: brouillon.coachNomLibre.trim() }
  }
  return {
    nom: brouillon.nom.trim(),
    couleur: brouillon.couleur.trim(),
    joueurs: lignes.map((joueur) => {
      const numero = lireNumero(joueur.numero)
      return {
        licence: joueur.licence.trim(),
        nom: joueur.nom.trim(),
        prenom: joueur.prenom.trim(),
        civilite: joueur.civilite,
        numero: Number.isNaN(numero) ? null : numero,
      }
    }),
    coach,
  }
}

export function partageVersBrouillon(equipe: EquipePartagee): BrouillonEquipe {
  const joueurs: JoueurBrouillon[] = equipe.joueurs.map((joueur) => ({
    id: nouvelId(),
    licencieId: null,
    numero: joueur.numero === null ? '' : String(joueur.numero),
    nom: joueur.nom,
    prenom: joueur.prenom,
    licence: joueur.licence,
    civilite: joueur.civilite,
  }))
  const brouillon: BrouillonEquipe = {
    nom: equipe.nom,
    couleur: equipe.couleur,
    clubId: null,
    joueurs: joueurs.length > 0 ? joueurs : [joueurBrouillonVide()],
    modeCoach: 'aucun',
    coachJoueurId: '',
    coachNomLibre: '',
  }
  if (equipe.coach?.type === 'joueur' && joueurs[equipe.coach.index]) {
    return { ...brouillon, modeCoach: 'joueur', coachJoueurId: joueurs[equipe.coach.index].id }
  }
  if (equipe.coach?.type === 'libre') return { ...brouillon, modeCoach: 'libre', coachNomLibre: equipe.coach.nom }
  return brouillon
}
