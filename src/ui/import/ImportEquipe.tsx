import { useState } from 'react'
import { lireCodeEquipe, type EquipePartagee } from '../../roster-share/format'
import { Dialogue } from '../commun/Dialogue'
import { lireTexte } from '../commun/fichiers'
import { ApercuEquipe } from './ApercuEquipe'
import { ScannerQr } from './ScannerQr'

interface Props {
  onImporter: (equipe: EquipePartagee) => void
  onFermer: () => void
  /** Vrai quand une équipe déjà saisie sera remplacée. */
  remplacement?: boolean
}

export function ImportEquipe({ onImporter, onFermer, remplacement = false }: Props) {
  const [saisie, setSaisie] = useState('')
  const [erreur, setErreur] = useState<string | null>(null)
  const [scan, setScan] = useState(false)
  const [equipe, setEquipe] = useState<EquipePartagee | null>(null)

  function lire(texte: string) {
    try {
      setEquipe(lireCodeEquipe(texte))
      setErreur(null)
      setScan(false)
    } catch (e) {
      setErreur(e instanceof Error ? e.message : String(e))
    }
  }

  async function lireFichier(fichier: File | undefined) {
    if (!fichier) return
    try {
      lire(await lireTexte(fichier))
    } catch {
      setErreur('Lecture du fichier impossible.')
    }
  }

  if (equipe) {
    return (
      <Dialogue
        titre="Équipe reçue"
        actions={
          <>
            <button className="btn btn-principal" onClick={() => onImporter(equipe)}>
              Utiliser cette équipe
            </button>
            <button className="btn" onClick={() => setEquipe(null)}>
              Retour
            </button>
          </>
        }
      >
        <ApercuEquipe equipe={equipe} />
        {remplacement && <p className="avertissements">L'équipe déjà saisie sera remplacée.</p>}
      </Dialogue>
    )
  }

  return (
    <Dialogue
      titre="Importer une équipe"
      actions={
        <button className="btn" onClick={onFermer}>
          Annuler
        </button>
      }
    >
      {scan ? (
        <ScannerQr
          onCode={lire}
          onErreur={(message) => {
            setScan(false)
            setErreur(message)
          }}
        />
      ) : (
        <button
          className="btn btn-principal"
          onClick={() => {
            setErreur(null)
            setScan(true)
          }}
        >
          Scanner le QR code
        </button>
      )}
      <label>
        Coller le lien ou le code
        <textarea rows={3} value={saisie} onChange={(e) => setSaisie(e.target.value)} />
      </label>
      <button className="btn" disabled={!saisie.trim()} onClick={() => lire(saisie)}>
        Lire le code
      </button>
      <label className="btn">
        Choisir un fichier
        <input
          type="file"
          accept=".txt,text/plain"
          className="masque"
          onChange={(e) => {
            void lireFichier(e.target.files?.[0])
            e.target.value = ''
          }}
        />
      </label>
      {erreur && (
        <p role="alert" className="erreurs">
          {erreur}
        </p>
      )}
    </Dialogue>
  )
}
