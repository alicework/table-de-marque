import { useId, type ReactNode } from 'react'

interface Props {
  titre: string
  children?: ReactNode
  actions: ReactNode
}

export function Dialogue({ titre, children, actions }: Props) {
  const idTitre = useId()
  return (
    <div className="voile">
      <div className="dialogue" role="dialog" aria-modal="true" aria-labelledby={idTitre}>
        <h2 id={idTitre}>{titre}</h2>
        {children}
        <div className="dialogue-actions">{actions}</div>
      </div>
    </div>
  )
}
