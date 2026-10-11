import { REGLES } from './config'
import { nouvelId } from './match'
import type { EquipeId, EquipeMatch, JoueurMatch, Match } from './types'

export interface VerificationEquipe {
  erreurs: string[]
  avertissements: string[]
}

export class ErreurEquipe extends Error {
  readonly erreurs: string[]

  constructor(erreurs: string[]) {
    super(erreurs.join(' '))
    this.name = 'ErreurEquipe'
    this.erreurs = erreurs
  }
}

export function verifierEquipe(equipe: EquipeMatch): VerificationEquipe {
  const erreurs: string[] = []
  const avertissements: string[] = []

  if (!equipe.nom.trim()) erreurs.push("Le nom de l'équipe est obligatoire.")
  if (equipe.joueurs.length === 0) erreurs.push('Ajoutez au moins un joueur.')
  if (equipe.joueurs.length > REGLES.joueursMax) {
    erreurs.push(`${REGLES.joueursMax} joueurs maximum (lignes de la feuille).`)
  }

  const vus = new Set<number>()
  const doubles = new Set<number>()
  for (const joueur of equipe.joueurs) {
    const valide =
      Number.isInteger(joueur.numero) && joueur.numero >= REGLES.numeroMin && joueur.numero <= REGLES.numeroMax
    if (!valide) {
      erreurs.push(
        `N° manquant ou invalide pour ${joueur.nom || 'un joueur'} (${REGLES.numeroMin} à ${REGLES.numeroMax}).`,
      )
    } else if (vus.has(joueur.numero)) {
      doubles.add(joueur.numero)
    } else {
      vus.add(joueur.numero)
    }
    if (!joueur.nom.trim()) erreurs.push(`Nom manquant pour le joueur n°${valide ? joueur.numero : '?'}.`)
  }
  for (const numero of [...doubles].sort((a, b) => a - b)) {
    erreurs.push(`Le n°${numero} est attribué plusieurs fois.`)
  }

  const coach = equipe.coach
  if (coach?.type === 'joueur' && !equipe.joueurs.some((joueur) => joueur.id === coach.joueurId)) {
    erreurs.push('Le coach sélectionné ne fait pas partie des joueurs.')
  }

  const joueuses = equipe.joueurs.filter((joueur) => joueur.civilite === 'Mme').length
  if (joueuses < REGLES.joueusesMin) {
    avertissements.push(
      `Seulement ${joueuses} joueuse${joueuses > 1 ? 's' : ''} : il en faut au moins ${REGLES.joueusesMin} sur le terrain.`,
    )
  }

  return { erreurs, avertissements }
}

function remplacerEquipe(match: Match, equipe: EquipeId, nouvelle: EquipeMatch): Match {
  const { erreurs } = verifierEquipe(nouvelle)
  if (erreurs.length > 0) throw new ErreurEquipe(erreurs)
  return { ...match, equipes: { ...match.equipes, [equipe]: nouvelle } }
}

export function ajouterJoueurAuMatch(match: Match, equipe: EquipeId, joueur: Omit<JoueurMatch, 'id'>): Match {
  const actuelle = match.equipes[equipe]
  return remplacerEquipe(match, equipe, { ...actuelle, joueurs: [...actuelle.joueurs, { ...joueur, id: nouvelId() }] })
}

export function changerNumero(match: Match, equipe: EquipeId, joueurId: string, numero: number): Match {
  const actuelle = match.equipes[equipe]
  return remplacerEquipe(match, equipe, {
    ...actuelle,
    joueurs: actuelle.joueurs.map((joueur) => (joueur.id === joueurId ? { ...joueur, numero } : joueur)),
  })
}
