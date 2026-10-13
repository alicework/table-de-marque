import { useRef } from 'react'
import { REGLES } from '../../domain/config'
import type { EtatMatch } from '../../domain/etat'
import { parNumero } from '../../domain/match'
import { niveauFautesJoueur } from '../../domain/regles'
import type { Match } from '../../domain/types'
import type { Garder } from '../commun/gardeDoubleTap'
import { IconeCroix } from '../commun/Icones'
import { PastillesFautes } from '../commun/PastillesFautes'
import { pluriel } from '../format'
import type { ActionEnAttente } from './types'

interface Props {
  match: Match
  etat: EtatMatch
  action: ActionEnAttente
  garder: Garder
  /** joueurId null = coach (faute uniquement) */
  onChoisir: (joueurId: string | null) => void
  onAnnuler: () => void
}

export function ChoixJoueur({ match, etat, action, garder, onChoisir, onAnnuler }: Props) {
  // Un double tap ne doit enregistrer qu'une action : le second clic arrive avant le re-rendu.
  // La garde passe avant ce verrou : un tap qu'elle ignore ne doit pas condamner la tuile.
  const dejaChoisi = useRef(false)
  const choisir = (joueurId: string | null) => {
    if (dejaChoisi.current) return
    dejaChoisi.current = true
    onChoisir(joueurId)
  }

  const equipe = match.equipes[action.equipe]
  const stats = etat.equipes[action.equipe]
  const valeur = action.type === 'panier' ? `+${action.valeur}` : 'Faute'

  return (
    <section className="ecran choix-joueur">
      <header className={`bandeau-choix ${action.type === 'panier' ? 'choix-panier' : 'choix-faute'}`}>
        <h2>
          <span className="valeur-action">{valeur}</span> — {equipe.nom}
        </h2>
        <button className="btn" onClick={onAnnuler}>
          <IconeCroix />
          Annuler
        </button>
      </header>
      <div className="grille-joueurs">
        {[...equipe.joueurs].sort(parNumero).map((joueur) => {
          const { fautes, points } = stats.joueurs[joueur.id]
          const niveau = niveauFautesJoueur(fautes)
          return (
            <button
              key={joueur.id}
              className={`tuile niveau-${niveau}`}
              disabled={action.type === 'panier' && niveau === 'exclu'}
              aria-label={`n°${joueur.numero}, ${pluriel(fautes, 'faute')}, ${pluriel(points, 'point')}`}
              onClick={() => garder(choisir)(joueur.id)}
            >
              <span className="tuile-numero">{joueur.numero}</span>
              <PastillesFautes fautes={fautes} />
              <span className="tuile-points">{pluriel(points, 'pt')}</span>
            </button>
          )
        })}
        {action.type === 'faute' && (
          <button
            className="tuile tuile-coach"
            aria-label={`Coach, ${pluriel(stats.fautesCoach, 'faute')}`}
            onClick={() => garder(choisir)(null)}
          >
            <span className="tuile-numero">Coach</span>
            <PastillesFautes fautes={stats.fautesCoach} total={Math.max(stats.fautesCoach, REGLES.fautesPersoMax)} />
          </button>
        )}
      </div>
    </section>
  )
}
