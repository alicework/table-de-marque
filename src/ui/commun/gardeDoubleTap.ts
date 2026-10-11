import { useRef } from 'react'

// 300 ms ≈ seuil de double tap des OS : un tap accepté rend l'écran suivant sourd pendant ce délai.
export const GARDE_DOUBLE_TAP = { delaiMs: 300, maintenant: () => Date.now() }

export type Garder = <Args extends unknown[]>(fn: (...args: Args) => void) => (...args: Args) => void

export function useGardeDoubleTap(): Garder {
  const ignorerJusqua = useRef(0)
  return <Args extends unknown[]>(fn: (...args: Args) => void) =>
    (...args: Args) => {
      const instant = GARDE_DOUBLE_TAP.maintenant()
      if (instant < ignorerJusqua.current) return
      ignorerJusqua.current = instant + GARDE_DOUBLE_TAP.delaiMs
      fn(...args)
    }
}
