import type { Match, Officiels } from '../../domain/types'

interface Props {
  match: Match
  /** Valeurs affichées : l'écran parent les détient, pour que le PDF et l'e-mail voient la dernière frappe. */
  officiels: Officiels
  onChange: (officiels: Officiels) => void
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

/** Sept champs facultatifs, repliés par défaut. Composant contrôlé : chaque frappe remonte au parent. */
export function FormulaireOfficiels({ match, officiels, onChange }: Props) {
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
              onChange={(e) => onChange({ ...officiels, [cle]: e.target.value })}
            />
          </label>
        ))}
      </div>
    </details>
  )
}
