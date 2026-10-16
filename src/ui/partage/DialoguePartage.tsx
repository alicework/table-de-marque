import { useEffect, useState } from 'react'
import { encoderEquipe, lienEquipe, type EquipePartagee } from '../../roster-share/format'
import { qrSvg } from '../../roster-share/qr'
import { Dialogue } from '../commun/Dialogue'
import { pluriel } from '../format'
import { adresseApp } from './adresse'

interface Props {
  equipe: EquipePartagee
  onFermer: () => void
}

export function DialoguePartage({ equipe, onFermer }: Props) {
  const [code] = useState(() => encoderEquipe(equipe))
  const lien = lienEquipe(code, adresseApp())
  const [svg, setSvg] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)

  useEffect(() => {
    let actif = true
    qrSvg(lien)
      .then((resultat) => {
        if (actif) setSvg(resultat)
      })
      .catch(() => {
        if (actif) setMessage('QR code impossible à générer : utilisez le code.')
      })
    return () => {
      actif = false
    }
  }, [lien])

  async function copierCode() {
    try {
      await navigator.clipboard.writeText(code)
      setMessage('Code copié.')
    } catch {
      setMessage('Copie impossible : sélectionnez le code ci-dessous.')
    }
  }

  return (
    <Dialogue
      titre="Partager l'équipe"
      actions={
        <button className="btn" onClick={onFermer}>
          Fermer
        </button>
      }
    >
      <p>
        {equipe.nom} — {pluriel(equipe.joueurs.length, 'joueur')}
      </p>
      {svg ? (
        <div className="qr" role="img" aria-label="QR code de l'équipe" dangerouslySetInnerHTML={{ __html: svg }} />
      ) : (
        <p className="chargement">Préparation du QR code…</p>
      )}
      <div className="actions-equipe">
        <button className="btn" onClick={() => void copierCode()}>
          Copier le code
        </button>
      </div>
      {message && <p role="status">{message}</p>}
      <label>
        Code de l'équipe
        <textarea readOnly rows={3} value={code} onFocus={(e) => e.target.select()} />
      </label>
    </Dialogue>
  )
}
