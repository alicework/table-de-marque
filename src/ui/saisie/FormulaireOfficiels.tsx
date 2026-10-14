import { useState } from 'react'
import { definirOfficiels } from '../../domain/commandes'
import { OFFICIELS_VIDES } from '../../domain/match'
import type { Match, Officiels } from '../../domain/types'
import type { Appliquer } from '../useMatch'

interface Props {
  match: Match
  appliquer: Appliquer
}

const CHAMPS: { cle: keyof Officiels; libelle: (match: Match) => string }[] = [
  { cle: 'chronometreur', libelle: () => 'Chronométreur' },
  { cle: 'operateur30s', libelle: () => 'Opérateur 30"' },
  { cle: 'marqueur', libelle: () => 'Marqueur' },
  { cle: 'arbitre', libelle: () => 'Arbitre' },
  { cle: 'aideArbitre', libelle: () => 'Aide arbitre' },
  { cle: 'capitaineA', libelle: (match) => `Capitaine A (${match.equipes.A.nom})` },
  { cle: 'capitaineB', libelle: (match) => `Capitaine B (${match.equipes.B.nom})` },
]

/** Sept champs facultatifs, enregistrés dans le match à la perte de focus. État local pour ne jamais perdre une frappe. */
export function FormulaireOfficiels({ match, appliquer }: Props) {
  const [officiels, setOfficiels] = useState<Officiels>({ ...OFFICIELS_VIDES, ...match.officiels })
  const enregistrer = () => void appliquer((m) => definirOfficiels(m, officiels))

  return (
    <details className="officiels">
      <summary>Officiels et capitaines</summary>
      <div className="grille-champs">
        {CHAMPS.map(({ cle, libelle }) => (
          <label key={cle}>
            {libelle(match)}
            <input
              value={officiels[cle]}
              autoComplete="off"
              onChange={(e) => setOfficiels({ ...officiels, [cle]: e.target.value })}
              onBlur={enregistrer}
            />
          </label>
        ))}
      </div>
    </details>
  )
}
