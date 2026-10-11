import type { EquipeId, Evenement, Match, Periode } from './types'

export interface StatsJoueur {
  points: number
  lf: number
  deuxPts: number
  troisPts: number
  fautes: number
}

export interface EtatEquipe {
  score: number
  pointsParPeriode: Record<string, number>
  fautesEquipeParPeriode: Record<string, number>
  tempsMortsParPeriode: Record<string, number>
  fautesCoach: number
  /** Indexé par JoueurMatch.id */
  joueurs: Record<string, StatsJoueur>
}

export interface LigneChronologie {
  evenement: Evenement
  /** Période pendant laquelle l'événement a eu lieu */
  periode: Periode
  /** Score après l'événement */
  scoreA: number
  scoreB: number
}

export interface EtatMatch {
  periode: Periode
  periodes: Periode[]
  termine: boolean
  equipes: Record<EquipeId, EtatEquipe>
  chronologie: LigneChronologie[]
}

function etatEquipeVide(match: Match, equipe: EquipeId): EtatEquipe {
  const joueurs: Record<string, StatsJoueur> = {}
  for (const joueur of match.equipes[equipe].joueurs) {
    joueurs[joueur.id] = { points: 0, lf: 0, deuxPts: 0, troisPts: 0, fautes: 0 }
  }
  return {
    score: 0,
    pointsParPeriode: {},
    fautesEquipeParPeriode: {},
    tempsMortsParPeriode: {},
    fautesCoach: 0,
    joueurs,
  }
}

function incrementer(compteur: Record<string, number>, cle: string, n = 1) {
  compteur[cle] = (compteur[cle] ?? 0) + n
}

export function calculerEtat(match: Match): EtatMatch {
  const equipes: Record<EquipeId, EtatEquipe> = { A: etatEquipeVide(match, 'A'), B: etatEquipeVide(match, 'B') }
  let periode: Periode = 'MT1'
  const periodes: Periode[] = ['MT1']
  let termine = false
  const chronologie: LigneChronologie[] = []

  for (const evenement of match.evenements) {
    switch (evenement.type) {
      case 'panier': {
        const equipe = equipes[evenement.equipe]
        equipe.score += evenement.valeur
        incrementer(equipe.pointsParPeriode, periode, evenement.valeur)
        const joueur = equipe.joueurs[evenement.joueurId]
        if (joueur) {
          joueur.points += evenement.valeur
          if (evenement.valeur === 1) joueur.lf++
          else if (evenement.valeur === 2) joueur.deuxPts++
          else joueur.troisPts++
        }
        break
      }
      case 'faute': {
        const equipe = equipes[evenement.equipe]
        incrementer(equipe.fautesEquipeParPeriode, periode)
        if (evenement.joueurId === null) {
          equipe.fautesCoach++
        } else {
          const joueur = equipe.joueurs[evenement.joueurId]
          if (joueur) joueur.fautes++
        }
        break
      }
      case 'tempsMort':
        incrementer(equipes[evenement.equipe].tempsMortsParPeriode, periode)
        break
      case 'debutPeriode':
        periode = evenement.periode
        periodes.push(evenement.periode)
        break
      case 'finMatch':
        termine = true
        break
    }
    chronologie.push({ evenement, periode, scoreA: equipes.A.score, scoreB: equipes.B.score })
  }

  return { periode, periodes, termine, equipes, chronologie }
}

export function fautesEquipeEnCours(etat: EtatMatch, equipe: EquipeId): number {
  return etat.equipes[equipe].fautesEquipeParPeriode[etat.periode] ?? 0
}

export function tempsMortsEnCours(etat: EtatMatch, equipe: EquipeId): number {
  return etat.equipes[equipe].tempsMortsParPeriode[etat.periode] ?? 0
}
