import { useState } from 'react'
import { annulerDernier, remplacerEvenement, supprimerEvenement } from '../../domain/commandes'
import type { EtatMatch } from '../../domain/etat'
import { libellePeriode } from '../../domain/periodes'
import type { Evenement, Match } from '../../domain/types'
import { Dialogue } from '../commun/Dialogue'
import type { Garder } from '../commun/gardeDoubleTap'
import { decrireEvenement } from '../format'
import type { Appliquer } from '../useMatch'
import { EditionEvenement, type EvenementModifiable } from './EditionEvenement'
import { GestionJoueurs } from './GestionJoueurs'

function estModifiable(evenement: Evenement): evenement is EvenementModifiable {
  return evenement.type === 'panier' || evenement.type === 'faute' || evenement.type === 'tempsMort'
}

interface Props {
  match: Match
  etat: EtatMatch
  appliquer: Appliquer
  garder: Garder
  onRetour: () => void
}

export function Journal({ match, etat, appliquer, garder, onRetour }: Props) {
  const [edition, setEdition] = useState<EvenementModifiable | null>(null)
  const [suppression, setSuppression] = useState<EvenementModifiable | null>(null)

  return (
    <section className="ecran journal">
      <header className="entete">
        <h1>Journal</h1>
        <button className="btn btn-principal" onClick={garder(onRetour)}>
          Retour au match
        </button>
      </header>
      <button
        className="btn"
        disabled={match.evenements.length === 0}
        onClick={garder(() => void appliquer(annulerDernier))}
      >
        ↶ Annuler la dernière action
      </button>
      <ol className="liste-journal" aria-label="Actions du match">
        {[...etat.chronologie].reverse().map(({ evenement, periode, scoreA, scoreB }) => {
          const description = decrireEvenement(match, evenement)
          return (
            <li key={evenement.id}>
              <span className="journal-periode">{libellePeriode(periode)}</span>
              <span className="journal-score">
                {scoreA}–{scoreB}
              </span>
              <span>{description}</span>
              {estModifiable(evenement) && (
                <span className="journal-actions">
                  <button
                    className="btn btn-discret"
                    aria-label={`Modifier : ${description}`}
                    onClick={() => setEdition(evenement)}
                  >
                    Modifier
                  </button>
                  <button
                    className="btn btn-discret"
                    aria-label={`Supprimer : ${description}`}
                    onClick={() => setSuppression(evenement)}
                  >
                    Supprimer
                  </button>
                </span>
              )}
            </li>
          )
        })}
      </ol>
      <GestionJoueurs match={match} appliquer={appliquer} />

      {edition && (
        <EditionEvenement
          match={match}
          evenement={edition}
          onValider={garder((evenement: EvenementModifiable) => {
            void appliquer((m) => remplacerEvenement(m, evenement))
            setEdition(null)
          })}
          onAnnuler={() => setEdition(null)}
        />
      )}
      {suppression && (
        <Dialogue
          titre="Supprimer cette action ?"
          actions={
            <>
              <button
                className="btn btn-danger"
                onClick={garder(() => {
                  const id = suppression.id
                  void appliquer((m) => supprimerEvenement(m, id))
                  setSuppression(null)
                })}
              >
                Supprimer
              </button>
              <button className="btn" onClick={() => setSuppression(null)}>
                Annuler
              </button>
            </>
          }
        >
          <p>{decrireEvenement(match, suppression)}</p>
        </Dialogue>
      )}
    </section>
  )
}
