import { REGLES } from './config'
import { fautesEquipeEnCours, type EtatMatch } from './etat'
import { parNumero } from './match'
import { EQUIPES, type Match } from './types'

export type NiveauFautesEquipe = 'normal' | 'attention' | 'limite' | 'penalite'
export type NiveauFautesJoueur = 'normal' | 'attention' | 'exclu'

export interface Alerte {
  cle: string
  message: string
}

/** Au-delà du seuil (9e faute et suivantes), chaque faute donne 2 lancers francs. */
export function niveauFautesEquipe(fautes: number): NiveauFautesEquipe {
  if (fautes > REGLES.seuilFautesEquipe) return 'penalite'
  if (fautes >= REGLES.seuilFautesEquipe) return 'limite'
  if (fautes >= REGLES.alerteFautesEquipe) return 'attention'
  return 'normal'
}

export function niveauFautesJoueur(fautes: number): NiveauFautesJoueur {
  if (fautes >= REGLES.fautesPersoMax) return 'exclu'
  if (fautes === REGLES.fautesPersoMax - 1) return 'attention'
  return 'normal'
}

export function alertesActives(match: Match, etat: EtatMatch): Alerte[] {
  const alertes: Alerte[] = []
  for (const equipe of EQUIPES) {
    const nom = match.equipes[equipe].nom
    const fautesEquipe = fautesEquipeEnCours(etat, equipe)
    if (fautesEquipe >= REGLES.seuilFautesEquipe) {
      alertes.push({
        cle: `fautes-equipe-${equipe}`,
        message: `${nom} : ${fautesEquipe} fautes d'équipe — au-delà de ${REGLES.seuilFautesEquipe}, 2 lancers francs`,
      })
    }
    for (const joueur of [...match.equipes[equipe].joueurs].sort(parNumero)) {
      const fautes = etat.equipes[equipe].joueurs[joueur.id]?.fautes ?? 0
      if (fautes >= REGLES.fautesPersoMax) {
        alertes.push({ cle: `exclu-${joueur.id}`, message: `${nom} : n°${joueur.numero} a ${fautes} fautes, doit sortir` })
      }
    }
  }
  return alertes
}
