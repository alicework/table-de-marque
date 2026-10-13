import type { EtatMatch } from '../../domain/etat'
import { alertesActives } from '../../domain/regles'
import { EQUIPES, type EquipeId, type Match } from '../../domain/types'
import { IconeChrono, IconeListe, IconeMaison, IconeRetour } from '../commun/Icones'
import { decrireEvenement } from '../format'
import { Alertes } from './Alertes'
import { Bandeau } from './Bandeau'
import type { ActionEnAttente } from './types'

interface Props {
  match: Match
  etat: EtatMatch
  onAction: (action: ActionEnAttente) => void
  onTempsMort: (equipe: EquipeId) => void
  onAnnulerDernier: () => void
  onFinPeriode: () => void
  onJournal: () => void
  onAccueil: () => void
  onPossession?: (equipe: EquipeId) => void
}

const VALEURS = [1, 2, 3] as const

export function EcranAction({
  match,
  etat,
  onAction,
  onTempsMort,
  onAnnulerDernier,
  onFinPeriode,
  onJournal,
  onAccueil,
  onPossession,
}: Props) {
  const derniere = etat.chronologie.at(-1)
  return (
    <section className="ecran ecran-action">
      <Bandeau match={match} etat={etat} onPossession={onPossession} />
      <Alertes alertes={alertesActives(match, etat)} />
      <div className="blocs-equipes">
        {EQUIPES.map((equipe) => (
          <div
            key={equipe}
            className={`bloc-equipe carte equipe-${equipe}`}
            role="group"
            aria-label={`Actions ${match.equipes[equipe].nom}`}
          >
            <p className="bloc-titre libelle">{match.equipes[equipe].nom}</p>
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
              <IconeChrono />
              Temps mort
            </button>
          </div>
        ))}
      </div>
      <p className="derniere-action">
        Dernière action :{' '}
        {derniere ? (
          <>
            <span className="puce">
              {derniere.scoreA} – {derniere.scoreB}
            </span>{' '}
            · <b>{decrireEvenement(match, derniere.evenement)}</b>
          </>
        ) : (
          'aucune'
        )}
      </p>
      <nav className="barre-basse">
        <button
          className="btn"
          aria-label="Annuler la dernière action"
          disabled={match.evenements.length === 0}
          onClick={onAnnulerDernier}
        >
          <IconeRetour />
          Annuler
        </button>
        <button className="btn" onClick={onJournal}>
          <IconeListe />
          Journal
        </button>
        <button className="btn btn-principal" onClick={onFinPeriode}>
          Fin de période
        </button>
        <button className="btn btn-discret" onClick={onAccueil}>
          <IconeMaison />
          Accueil
        </button>
      </nav>
    </section>
  )
}
