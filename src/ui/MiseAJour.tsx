import { useRegisterSW } from 'virtual:pwa-register/react'

export function MiseAJour({ autorisee }: { autorisee: boolean }) {
  const {
    needRefresh: [besoin],
    updateServiceWorker,
  } = useRegisterSW()

  if (!besoin || !autorisee) return null
  return (
    <div className="bandeau-maj" role="status">
      <span>Nouvelle version disponible</span>
      <button className="btn btn-principal" onClick={() => void updateServiceWorker(true)}>
        Recharger
      </button>
    </div>
  )
}
