import type { EtatMatch } from '../../domain/etat'
import type { Match } from '../../domain/types'

interface Props {
  match: Match
  etat: EtatMatch
  onRouvrir: () => void
  onAccueil: () => void
}

export function MatchTermine({ match, etat, onRouvrir, onAccueil }: Props) {
  return (
    <section className="ecran match-termine carte">
      <h1>Match terminé</h1>
      <p className="score-final" aria-label="Score final">
        {match.equipes.A.nom} {etat.equipes.A.score} – {etat.equipes.B.score} {match.equipes.B.nom}
      </p>
      <button className="btn" onClick={onRouvrir}>
        Rouvrir pour corriger
      </button>
      <button className="btn btn-principal" onClick={onAccueil}>
        Accueil
      </button>
    </section>
  )
}
