import { REGLES } from '../../domain/config'

interface Props {
  fautes: number
  total?: number
}

/** Cercles de fautes personnelles. Purement visuel : le texte accessible est porté par l'élément parent. */
export function PastillesFautes({ fautes, total = REGLES.fautesPersoMax }: Props) {
  return (
    <span className="pastilles-fautes" aria-hidden="true">
      {Array.from({ length: total }, (_, index) => (
        <i key={index} className={index < fautes ? 'pleine' : undefined} />
      ))}
    </span>
  )
}
