import { REGLES } from '../../domain/config'
import { fautesEquipeEnCours, tempsMortsEnCours, type EtatMatch } from '../../domain/etat'
import { libellePeriode } from '../../domain/periodes'
import { niveauFautesEquipe } from '../../domain/regles'
import type { EquipeId, Match } from '../../domain/types'
import { IconeTriangleDroite, IconeTriangleGauche } from '../commun/Icones'

interface Props {
  match: Match
  etat: EtatMatch
  /** Absent = bandeau en lecture seule, sans flèche de possession. */
  onPossession?: (equipe: EquipeId) => void
}

export function Bandeau({ match, etat, onPossession }: Props) {
  const blocEquipe = (equipe: EquipeId) => {
    const nom = match.equipes[equipe].nom
    const fautes = fautesEquipeEnCours(etat, equipe)
    const niveau = niveauFautesEquipe(fautes)
    return (
      <div className={`bandeau-equipe equipe-${equipe}`}>
        <strong className="bandeau-nom">
          <i className="couleur-equipe" aria-hidden="true" />
          {nom}
        </strong>
        <div className="compteurs">
          <span className={`fautes-equipe fautes-bloc niveau-${niveau}`} aria-label={`Fautes d'équipe ${nom}`}>
            <span className="libelle">Fautes éq.</span>{' '}
            <span className="valeur">
              {fautes}/{REGLES.seuilFautesEquipe}
              {niveau === 'penalite' && <small> · 2 LF</small>}
            </span>
          </span>
          <span className="pastille" aria-label={`Temps morts ${nom}`}>
            <span className="libelle">TM</span> <b>{tempsMortsEnCours(etat, equipe)}</b>
          </span>
        </div>
      </div>
    )
  }

  const cotePossession = (equipe: EquipeId) => {
    const actif = (match.possession ?? null) === equipe
    const nom = match.equipes[equipe].nom
    return (
      <button
        type="button"
        className={`possession-cote equipe-${equipe}`}
        aria-pressed={actif}
        aria-label={`Possession ${nom}`}
        onClick={() => {
          if (!actif) onPossession?.(equipe)
        }}
      >
        {equipe === 'A' && <IconeTriangleGauche />}
        <span className="possession-nom">{nom}</span>
        {equipe === 'B' && <IconeTriangleDroite />}
      </button>
    )
  }

  return (
    <header className="bandeau carte">
      {blocEquipe('A')}
      <div className="bandeau-score">
        <span className="score" aria-label="Score">
          {etat.equipes.A.score} – {etat.equipes.B.score}
        </span>
        <span className="periode">{libellePeriode(etat.periode)}</span>
      </div>
      {blocEquipe('B')}
      {onPossession && (
        <div className="possession" role="group" aria-label="Flèche de possession">
          {cotePossession('A')}
          <span className="possession-libelle" aria-hidden="true">
            Possession
          </span>
          {cotePossession('B')}
        </div>
      )}
    </header>
  )
}
