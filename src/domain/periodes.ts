import type { EtatMatch } from './etat'
import type { Periode } from './types'

export type ChoixFinPeriode = 'periodeSuivante' | 'prolongation' | 'finMatch'

export function choixFinPeriode(etat: EtatMatch): ChoixFinPeriode[] {
  if (etat.termine) return []
  if (etat.periode === 'MT1') return ['periodeSuivante']
  const egalite = etat.equipes.A.score === etat.equipes.B.score
  return egalite ? ['prolongation', 'finMatch'] : ['finMatch']
}

export function periodeSuivante(periode: Periode): Periode {
  if (periode === 'MT1') return 'MT2'
  if (periode === 'MT2') return 'P1'
  return `P${Number(periode.slice(1)) + 1}` as Periode
}

export function libellePeriode(periode: Periode): string {
  if (periode === 'MT1') return '1ère mi-temps'
  if (periode === 'MT2') return '2ème mi-temps'
  const numero = Number(periode.slice(1))
  return numero === 1 ? 'Prolongation' : `Prolongation ${numero}`
}
