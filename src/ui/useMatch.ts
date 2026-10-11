import { useLiveQuery } from 'dexie-react-hooks'
import { useCallback, useRef, useState } from 'react'
import type { Match } from '../domain/types'
import { enregistrerMatch, lireMatch } from '../storage/matchs'

export const MESSAGE_ERREUR_STOCKAGE =
  "Enregistrement impossible sur cet appareil (stockage plein ou indisponible). La dernière action n'a pas été enregistrée."

export type Operation = (match: Match) => Match
export type Appliquer = (operation: Operation) => Promise<string | null>

async function executer(
  matchId: string,
  operation: Operation,
  signalerErreurStockage: (message: string) => void,
): Promise<string | null> {
  let suivant: Match
  try {
    const courant = await lireMatch(matchId)
    if (!courant) return 'Match introuvable.'
    suivant = operation(courant)
  } catch (erreur) {
    return erreur instanceof Error ? erreur.message : String(erreur)
  }
  try {
    await enregistrerMatch(suivant)
    return null
  } catch {
    signalerErreurStockage(MESSAGE_ERREUR_STOCKAGE)
    return MESSAGE_ERREUR_STOCKAGE
  }
}

export function useMatch(matchId: string) {
  const match = useLiveQuery(() => lireMatch(matchId), [matchId])
  const [erreurStockage, setErreurStockage] = useState<string | null>(null)
  // File d'attente : deux taps rapprochés ne doivent jamais partir du même état.
  const file = useRef<Promise<unknown>>(Promise.resolve())

  const appliquer = useCallback<Appliquer>(
    (operation) => {
      const execution = file.current.then(() => executer(matchId, operation, setErreurStockage))
      file.current = execution.catch(() => undefined)
      return execution
    },
    [matchId],
  )

  const effacerErreurStockage = useCallback(() => setErreurStockage(null), [])

  return { match, appliquer, erreurStockage, effacerErreurStockage }
}
