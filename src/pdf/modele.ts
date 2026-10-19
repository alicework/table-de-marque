import { REGLES } from '../domain/config'
import type { EtatMatch } from '../domain/etat'
import { parNumero } from '../domain/match'
import { libellePeriode } from '../domain/periodes'
import type { EquipeId, JoueurMatch, Match, Officiels } from '../domain/types'
import { formaterDateCourte, formaterDateLongue, formaterHeure, saison } from './texte'

export interface LigneJoueur {
  numero: number
  /** « Prenom NOM » ; nom seul ou prénom seul si l'autre manque ; « — » sinon */
  nom: string
  licence: string
  lf: number
  deuxPts: number
  troisPts: number
  points: number
  fautes: number
  /** 5 fautes atteintes (REGLES.fautesPersoMax) */
  exclu: boolean
}

export interface BlocEquipe {
  equipe: EquipeId
  nom: string
  /** Couleur de maillot, texte libre */
  couleur: string
  /** Nom affiché, « n°7 Prenom NOM » pour un coach joueur, null sans coach */
  coach: string | null
  fautesCoach: number
  /** Triés par n° croissant */
  joueurs: LigneJoueur[]
}

export interface LignePeriodes {
  equipe: EquipeId
  nom: string
  /** Une valeur par période jouée, puis le total */
  points: number[]
  /** Une valeur par période jouée */
  fautesEquipe: number[]
  /** Une valeur par période jouée */
  tempsMorts: number[]
}

export interface ModeleFeuille {
  titre: string
  sousTitre: string
  /** « vendredi 16 octobre 2026 », vide si la date manque */
  date: string
  /** Vide si non renseigné */
  lieu: string
  score: {
    nomA: string
    nomB: string
    scoreA: number
    scoreB: number
    /** « après prolongation », « après 2 prolongations », ou null */
    mention: string | null
  }
  periodes: {
    /** Libellés des périodes jouées puis « Total » */
    colonnes: string[]
    /** Une ligne par équipe, A puis B */
    lignes: LignePeriodes[]
  }
  equipes: Record<EquipeId, BlocEquipe>
  /** 5 entrées, dans l'ordre de la feuille officielle */
  officiels: { libelle: string; valeur: string }[]
  /** Capitaine A puis B, libellés suivis du nom de l'équipe ; signés sous le cadre d'observations */
  capitaines: { libelle: string; valeur: string }[]
  piedDePage: string
}

const LIBELLES_OFFICIELS: [keyof Officiels, string][] = [
  ['chronometreur', 'Chronométreur'],
  ['operateur30s', 'Opérateur 30"'],
  ['marqueur', 'Marqueur'],
  ['arbitre', 'Arbitre'],
  ['aideArbitre', 'Aide arbitre'],
]

const STATS_VIDES = { points: 0, lf: 0, deuxPts: 0, troisPts: 0, fautes: 0 }

/** « Prenom NOM », ou l'un des deux, ou « — ». */
export function nomJoueur(joueur: Pick<JoueurMatch, 'nom' | 'prenom'>): string {
  return [joueur.prenom.trim(), joueur.nom.trim().toUpperCase()].filter(Boolean).join(' ') || '—'
}

/** null sans prolongation, « après prolongation », « après 2 prolongations »… */
export function mentionProlongation(etat: EtatMatch): string | null {
  const n = etat.periodes.filter((periode) => periode.startsWith('P')).length
  if (n === 0) return null
  return n === 1 ? 'après prolongation' : `après ${n} prolongations`
}

function nomCoach(match: Match, equipe: EquipeId): string | null {
  const { coach, joueurs } = match.equipes[equipe]
  if (!coach) return null
  if (coach.type === 'libre') return coach.nom.trim() || null
  const joueur = joueurs.find((j) => j.id === coach.joueurId)
  return joueur ? `n°${joueur.numero} ${nomJoueur(joueur)}` : null
}

function composerEquipe(match: Match, etat: EtatMatch, equipe: EquipeId): BlocEquipe {
  const { nom, couleur, joueurs } = match.equipes[equipe]
  const stats = etat.equipes[equipe]
  return {
    equipe,
    nom,
    couleur,
    coach: nomCoach(match, equipe),
    fautesCoach: stats.fautesCoach,
    joueurs: [...joueurs].sort(parNumero).map((joueur) => {
      const s = stats.joueurs[joueur.id] ?? STATS_VIDES
      return {
        numero: joueur.numero,
        nom: nomJoueur(joueur),
        licence: joueur.licence,
        lf: s.lf,
        deuxPts: s.deuxPts,
        troisPts: s.troisPts,
        points: s.points,
        fautes: s.fautes,
        exclu: s.fautes >= REGLES.fautesPersoMax,
      }
    }),
  }
}

function composerLignePeriodes(match: Match, etat: EtatMatch, equipe: EquipeId): LignePeriodes {
  const e = etat.equipes[equipe]
  return {
    equipe,
    nom: match.equipes[equipe].nom,
    points: [...etat.periodes.map((p) => e.pointsParPeriode[p] ?? 0), e.score],
    fautesEquipe: etat.periodes.map((p) => e.fautesEquipeParPeriode[p] ?? 0),
    tempsMorts: etat.periodes.map((p) => e.tempsMortsParPeriode[p] ?? 0),
  }
}

export function composerFeuille(match: Match, etat: EtatMatch, maintenant = new Date()): ModeleFeuille {
  const nomA = match.equipes.A.nom
  const nomB = match.equipes.B.nom
  const saisonDuMatch = saison(match.date)
  return {
    titre: 'Feuille de match',
    sousTitre: saisonDuMatch ? `Basket loisir UFOLEP 33 · Saison ${saisonDuMatch}` : 'Basket loisir UFOLEP 33',
    date: formaterDateLongue(match.date),
    lieu: match.lieu.trim(),
    score: {
      nomA,
      nomB,
      scoreA: etat.equipes.A.score,
      scoreB: etat.equipes.B.score,
      mention: mentionProlongation(etat),
    },
    periodes: {
      colonnes: [...etat.periodes.map(libellePeriode), 'Total'],
      lignes: [composerLignePeriodes(match, etat, 'A'), composerLignePeriodes(match, etat, 'B')],
    },
    equipes: { A: composerEquipe(match, etat, 'A'), B: composerEquipe(match, etat, 'B') },
    officiels: LIBELLES_OFFICIELS.map(([cle, libelle]) => ({ libelle, valeur: match.officiels[cle] })),
    capitaines: [
      { libelle: `Capitaine A (${nomA})`, valeur: match.officiels.capitaineA },
      { libelle: `Capitaine B (${nomB})`, valeur: match.officiels.capitaineB },
    ],
    piedDePage: `Généré par Table de marque le ${formaterDateCourte(maintenant)} à ${formaterHeure(maintenant)}`,
  }
}
