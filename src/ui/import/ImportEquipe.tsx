import { useState } from 'react'
import { lireCodeEquipe, type EquipePartagee } from '../../roster-share/format'
import { Dialogue } from '../commun/Dialogue'
import { decoderOctets, lireExportWebaffiligue } from '../../webaffiligue/lireExport'
import { lireOctets } from '../commun/fichiers'
import { ApercuEquipe } from './ApercuEquipe'
import { ScannerQr } from './ScannerQr'

export const MESSAGE_EXPORT_WEBAFFILIGUE =
  'Ce fichier est un export LiguAsso (liste des licenciés), pas une équipe partagée. ' +
  'Importez-le depuis Accueil → Clubs et licenciés → Importer un export LiguAsso, ' +
  'puis choisissez les joueurs dans « Nouveau match ».'

function estExportWebaffiligue(octets: Uint8Array): boolean {
  try {
    lireExportWebaffiligue(octets)
    return true
  } catch {
    return false
  }
}

interface Props {
  onImporter: (equipe: EquipePartagee) => void
  onFermer: () => void
  /** Vrai quand une équipe déjà saisie sera remplacée. */
  remplacement?: boolean
  /** Erreur à afficher dès l'ouverture (lien illisible), dans le dialogue et non derrière son voile. */
  erreurInitiale?: string | null
}

export function ImportEquipe({ onImporter, onFermer, remplacement = false, erreurInitiale = null }: Props) {
  const [saisie, setSaisie] = useState('')
  const [erreur, setErreur] = useState<string | null>(erreurInitiale)
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
    let octets: Uint8Array
    try {
      octets = await lireOctets(fichier)
    } catch {
      setErreur('Lecture du fichier impossible.')
      return
    }
    // Confusion fréquente : l'export des licenciés donné à l'import d'une équipe partagée.
    if (estExportWebaffiligue(octets)) {
      setErreur(MESSAGE_EXPORT_WEBAFFILIGUE)
      return
    }
    lire(decoderOctets(octets))
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
