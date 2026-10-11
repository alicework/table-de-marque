import type { Alerte } from '../../domain/regles'

export function Alertes({ alertes }: { alertes: Alerte[] }) {
  if (alertes.length === 0) return null
  return (
    <ul className="alertes" aria-label="Alertes">
      {alertes.map((alerte) => (
        <li key={alerte.cle}>{alerte.message}</li>
      ))}
    </ul>
  )
}
