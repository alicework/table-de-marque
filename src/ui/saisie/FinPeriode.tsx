import type { EtatMatch } from '../../domain/etat'
import { choixFinPeriode, libellePeriode, type ChoixFinPeriode } from '../../domain/periodes'
import { Dialogue } from '../commun/Dialogue'

const LIBELLES: Record<ChoixFinPeriode, string> = {
  periodeSuivante: 'Passer à la 2ème mi-temps',
  prolongation: 'Jouer une prolongation',
  finMatch: 'Terminer le match',
}

interface Props {
  etat: EtatMatch
  onChoix: (choix: ChoixFinPeriode) => void
  onAnnuler: () => void
}

export function FinPeriode({ etat, onChoix, onAnnuler }: Props) {
  const choix = choixFinPeriode(etat)
  const egalite = etat.equipes.A.score === etat.equipes.B.score
  return (
    <Dialogue
      titre={`Fin de la ${libellePeriode(etat.periode).toLowerCase()} ?`}
      actions={
        <>
          {choix.map((c) => (
            <button key={c} className="btn btn-principal" onClick={() => onChoix(c)}>
              {LIBELLES[c]}
            </button>
          ))}
          <button className="btn" onClick={onAnnuler}>
            Annuler
          </button>
        </>
      }
    >
      {choix.includes('prolongation') && egalite && (
        <p>Égalité : une prolongation est possible si les deux équipes sont d'accord.</p>
      )}
    </Dialogue>
  )
}
