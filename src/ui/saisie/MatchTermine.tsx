import { useState } from 'react'
import { definirOfficiels } from '../../domain/commandes'
import { calculerEtat } from '../../domain/etat'
import { OFFICIELS_VIDES } from '../../domain/match'
import type { Match, Officiels } from '../../domain/types'
import type { Appliquer } from '../useMatch'
import { EnvoiFeuille } from './EnvoiFeuille'
import { FormulaireOfficiels } from './FormulaireOfficiels'

interface Props {
  match: Match
  appliquer: Appliquer
  onRouvrir: () => void
  onAccueil: () => void
}

/**
 * Les officiels vivent ici, pas dans le match lu en base : l'enregistrement est asynchrone et un tap sur
 * « Enregistrer le PDF » suit souvent la dernière frappe de trop près. Le PDF et l'e-mail partent donc du
 * match fusionné avec la saisie courante, et chaque frappe est enregistrée (la file de `useMatch` sérialise).
 */
export function MatchTermine({ match, appliquer, onRouvrir, onAccueil }: Props) {
  const [officiels, setOfficiels] = useState<Officiels>({ ...OFFICIELS_VIDES, ...match.officiels })
  const matchAJour = definirOfficiels(match, officiels)
  const etat = calculerEtat(matchAJour)

  const modifier = (valeurs: Officiels) => {
    setOfficiels(valeurs)
    void appliquer((m) => definirOfficiels(m, valeurs))
  }

  return (
    <section className="ecran match-termine carte">
      <h1>Match terminé</h1>
      <p className="score-final" aria-label="Score final">
        {match.equipes.A.nom} {etat.equipes.A.score} – {etat.equipes.B.score} {match.equipes.B.nom}
      </p>
      <FormulaireOfficiels match={match} officiels={officiels} onChange={modifier} />
      <EnvoiFeuille match={matchAJour} etat={etat} />
      <button className="btn" onClick={onRouvrir}>
        Rouvrir pour corriger
      </button>
      <button className="btn btn-principal" onClick={onAccueil}>
        Accueil
      </button>
    </section>
  )
}
