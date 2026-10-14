import { REGLES } from '../domain/config'
import { libellePeriode } from '../domain/periodes'
import type { EquipeId, Evenement, Match } from '../domain/types'

export function pluriel(n: number, mot: string): string {
  return `${n} ${mot}${n > 1 ? 's' : ''}`
}

export function pastillesFautes(fautes: number): string {
  const pleines = Math.min(fautes, REGLES.fautesPersoMax)
  return '●'.repeat(pleines) + '○'.repeat(REGLES.fautesPersoMax - pleines)
}

function numeroJoueur(match: Match, equipe: EquipeId, joueurId: string): string {
  const joueur = match.equipes[equipe].joueurs.find((j) => j.id === joueurId)
  return joueur ? `n°${joueur.numero}` : 'n°?'
}

export function decrireEvenement(match: Match, evenement: Evenement): string {
  switch (evenement.type) {
    case 'panier':
      return `+${evenement.valeur} ${numeroJoueur(match, evenement.equipe, evenement.joueurId)} ${match.equipes[evenement.equipe].nom}`
    case 'faute':
      return evenement.joueurId === null
        ? `Faute coach ${match.equipes[evenement.equipe].nom}`
        : `Faute ${numeroJoueur(match, evenement.equipe, evenement.joueurId)} ${match.equipes[evenement.equipe].nom}`
    case 'tempsMort':
      return `Temps mort ${match.equipes[evenement.equipe].nom}`
    case 'debutPeriode':
      return `Début : ${libellePeriode(evenement.periode)}`
    case 'finMatch':
      return 'Fin du match'
  }
}

export function aujourdhui(date = new Date()): string {
  const deuxChiffres = (n: number) => String(n).padStart(2, '0')
  return `${date.getFullYear()}-${deuxChiffres(date.getMonth() + 1)}-${deuxChiffres(date.getDate())}`
}

/** 600 → « 10:00 », 7 → « 0:07 ». */
export function formaterDuree(secondes: number): string {
  return `${Math.floor(secondes / 60)}:${String(secondes % 60).padStart(2, '0')}`
}
