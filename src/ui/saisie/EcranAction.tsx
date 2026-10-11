import type { EtatMatch } from '../../domain/etat'
import { EQUIPES, type EquipeId, type Match } from '../../domain/types'
import { decrireEvenement } from '../format'
import { Bandeau } from './Bandeau'
import type { ActionEnAttente } from './types'

interface Props {
  match: Match
  etat: EtatMatch
  onAction: (action: ActionEnAttente) => void
  onTempsMort: (equipe: EquipeId) => void
  onAnnulerDernier: () => void
  onAccueil: () => void
}

const VALEURS = [1, 2, 3] as const

export function EcranAction({ match, etat, onAction, onTempsMort, onAnnulerDernier, onAccueil }: Props) {
  const derniere = etat.chronologie.at(-1)
  return (
    <section className="ecran ecran-action">
      <Bandeau match={match} etat={etat} />
      <div className="blocs-equipes">
        {EQUIPES.map((equipe) => (
          <div
            key={equipe}
            className={`bloc-equipe equipe-${equipe}`}
            role="group"
            aria-label={`Actions ${match.equipes[equipe].nom}`}
          >
            <div className="grille-actions">
              {VALEURS.map((valeur) => (
                <button
                  key={valeur}
                  className="btn-action btn-points"
                  onClick={() => onAction({ equipe, type: 'panier', valeur })}
                >
                  +{valeur}
                </button>
              ))}
              <button
                className="btn-action btn-faute"
                aria-label="Faute"
                onClick={() => onAction({ equipe, type: 'faute' })}
              >
                F
              </button>
            </div>
            <button className="btn btn-temps-mort" onClick={() => onTempsMort(equipe)}>
              Temps mort
            </button>
          </div>
        ))}
      </div>
      <p className="derniere-action">
        Dernière action :{' '}
        {derniere
          ? `${derniere.scoreA} – ${derniere.scoreB} · ${decrireEvenement(match, derniere.evenement)}`
          : 'aucune'}
      </p>
      <nav className="barre-basse">
        <button className="btn btn-discret" disabled={match.evenements.length === 0} onClick={onAnnulerDernier}>
          ↶ Annuler
        </button>
        <button className="btn btn-discret" onClick={onAccueil}>
          Accueil
        </button>
      </nav>
    </section>
  )
}
