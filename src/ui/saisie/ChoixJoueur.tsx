import { useRef } from 'react'
import type { EtatMatch } from '../../domain/etat'
import { parNumero } from '../../domain/match'
import { niveauFautesJoueur } from '../../domain/regles'
import type { Match } from '../../domain/types'
import { pastillesFautes, pluriel } from '../format'
import type { ActionEnAttente } from './types'

interface Props {
  match: Match
  etat: EtatMatch
  action: ActionEnAttente
  /** joueurId null = coach (faute uniquement) */
  onChoisir: (joueurId: string | null) => void
  onAnnuler: () => void
}

export function ChoixJoueur({ match, etat, action, onChoisir, onAnnuler }: Props) {
  // Un double tap ne doit enregistrer qu'une action : le second clic arrive avant le re-rendu.
  const dejaChoisi = useRef(false)
  const choisir = (joueurId: string | null) => {
    if (dejaChoisi.current) return
    dejaChoisi.current = true
    onChoisir(joueurId)
  }

  const equipe = match.equipes[action.equipe]
  const stats = etat.equipes[action.equipe]
  const titre = action.type === 'panier' ? `+${action.valeur} — ${equipe.nom}` : `Faute — ${equipe.nom}`

  return (
    <section className="ecran choix-joueur">
      <header className={`bandeau-choix ${action.type === 'panier' ? 'choix-panier' : 'choix-faute'}`}>
        <h2>{titre}</h2>
        <button className="btn" onClick={onAnnuler}>
          ✕ Annuler
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
              onClick={() => choisir(joueur.id)}
            >
              <span className="tuile-numero">{joueur.numero}</span>
              <span className="tuile-fautes">{pastillesFautes(fautes)}</span>
              <span className="tuile-points">{pluriel(points, 'pt')}</span>
            </button>
          )
        })}
        {action.type === 'faute' && (
          <button
            className="tuile tuile-coach"
            aria-label={`Coach, ${pluriel(stats.fautesCoach, 'faute')}`}
            onClick={() => choisir(null)}
          >
            <span className="tuile-numero">Coach</span>
            <span className="tuile-fautes">{'●'.repeat(stats.fautesCoach)}</span>
          </button>
        )}
      </div>
    </section>
  )
}
