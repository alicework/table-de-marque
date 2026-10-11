import { useEffect, useRef } from 'react'
import { demarrerScanner } from './scanner'

export const MESSAGE_CAMERA =
  'Caméra indisponible ou refusée : collez le lien ou le code, ou choisissez un fichier.'

interface Props {
  onCode: (texte: string) => void
  onErreur: (message: string) => void
}

export function ScannerQr({ onCode, onErreur }: Props) {
  const video = useRef<HTMLVideoElement>(null)
  const rappels = useRef({ onCode, onErreur })

  useEffect(() => {
    rappels.current = { onCode, onErreur }
  })

  useEffect(() => {
    const element = video.current
    if (!element) return
    let actif = true
    let arreter: (() => void) | null = null
    demarrerScanner(element, (texte) => {
      if (actif) rappels.current.onCode(texte)
    })
      .then((controle) => {
        if (actif) {
          arreter = controle.arreter
        } else {
          controle.arreter()
        }
      })
      .catch(() => {
        if (actif) rappels.current.onErreur(MESSAGE_CAMERA)
      })
    return () => {
      actif = false
      arreter?.()
    }
  }, [])

  return <video ref={video} className="video-scanner" aria-label="Aperçu de la caméra" muted playsInline />
}
