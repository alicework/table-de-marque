import { REGLES } from '../../domain/config'
import { fautesEquipeEnCours, tempsMortsEnCours, type EtatMatch } from '../../domain/etat'
import { libellePeriode } from '../../domain/periodes'
import { niveauFautesEquipe } from '../../domain/regles'
import type { EquipeId, Match } from '../../domain/types'

interface Props {
  match: Match
  etat: EtatMatch
}

export function Bandeau({ match, etat }: Props) {
  const blocEquipe = (equipe: EquipeId) => {
    const nom = match.equipes[equipe].nom
    const fautes = fautesEquipeEnCours(etat, equipe)
    return (
      <div className={`bandeau-equipe equipe-${equipe}`}>
        <strong>{nom}</strong>
        <span
          className={`fautes-equipe niveau-${niveauFautesEquipe(fautes)}`}
          aria-label={`Fautes d'équipe ${nom}`}
        >
          Fautes éq. {fautes}/{REGLES.seuilFautesEquipe}
        </span>
        <span aria-label={`Temps morts ${nom}`}>TM {tempsMortsEnCours(etat, equipe)}</span>
      </div>
    )
  }

  return (
    <header className="bandeau">
      {blocEquipe('A')}
      <div className="bandeau-score">
        <span className="score" aria-label="Score">
          {etat.equipes.A.score} – {etat.equipes.B.score}
        </span>
        <span className="periode">{libellePeriode(etat.periode)}</span>
      </div>
      {blocEquipe('B')}
    </header>
  )
}
