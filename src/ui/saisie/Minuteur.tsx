import { useEffect, useRef, useState } from 'react'
import { Dialogue } from '../commun/Dialogue'
import { emettreSignal } from '../commun/signal'
import { useEcranAllume } from '../commun/veille'
import { formaterDuree } from '../format'

/** Rafraîchissement plus fréquent que la seconde : l'affichage ne saute pas de chiffre. */
const PAS_MS = 250

interface Props {
  titre: string
  /** Horodatage (ms) de fin du décompte. */
  fin: number
  onFermer: () => void
}

/** Secondes restantes, recalculées depuis l'horloge : pas de dérive si l'onglet est ralenti. */
function restant(fin: number): number {
  return Math.max(0, Math.ceil((fin - Date.now()) / 1000))
}

export function Minuteur({ titre, fin, onFermer }: Props) {
  const [secondes, setSecondes] = useState(() => restant(fin))
  const signale = useRef(false)
  const termine = secondes === 0
  useEcranAllume()

  useEffect(() => {
    if (termine) {
      // Garde : le mode strict rejoue les effets, le signal ne doit partir qu'une fois.
      if (!signale.current) {
        signale.current = true
        emettreSignal()
      }
      return
    }
    const minuterie = setInterval(() => setSecondes(restant(fin)), PAS_MS)
    return () => clearInterval(minuterie)
  }, [fin, termine])

  return (
    <Dialogue
      titre={titre}
      actions={
        <button className="btn btn-principal" onClick={onFermer}>
          Fermer
        </button>
      }
    >
      <p className={termine ? 'minuteur minuteur-termine' : 'minuteur'} role="timer" aria-label="Temps restant">
        {formaterDuree(secondes)}
      </p>
    </Dialogue>
  )
}
