import { useEffect } from 'react'

/**
 * Empêche la mise en veille de l'écran tant que le composant est affiché : sans cela, le téléphone
 * se verrouille pendant une mi-temps et le signal de fin ne part pas. Sans Wake Lock, ne fait rien.
 */
export function useEcranAllume(): void {
  useEffect(() => {
    let actif = true
    let verrou: WakeLockSentinel | null = null
    // Le navigateur libère le verrou quand la page passe en arrière-plan : on le redemande au retour.
    const demander = () => {
      if (document.visibilityState !== 'visible') return
      try {
        navigator.wakeLock?.request('screen').then(
          (sentinelle) => {
            if (actif) verrou = sentinelle
            else sentinelle.release().catch(() => {})
          },
          () => {},
        )
      } catch {
        // Wake Lock absent ou refusé.
      }
    }
    demander()
    document.addEventListener('visibilitychange', demander)
    return () => {
      actif = false
      document.removeEventListener('visibilitychange', demander)
      verrou?.release().catch(() => {})
    }
  }, [])
}
