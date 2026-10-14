import { useState } from 'react'
import type { EtatMatch } from '../../domain/etat'
import type { Match } from '../../domain/types'
import { courrielFeuille, nomFichierFeuille } from '../../pdf/courriel'
import { Dialogue } from '../commun/Dialogue'
import { enregistrerFichier, genererFeuillePdf } from './feuille'

interface Props {
  match: Match
  etat: EtatMatch
}

const ADRESSE_VALIDE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

/** Enregistrement du PDF et e-mail pré-rempli ; l'adresse du coach adverse reste un état d'écran, jamais enregistrée. */
export function EnvoiFeuille({ match, etat }: Props) {
  const [coachAdverse, setCoachAdverse] = useState('')
  const [enCours, setEnCours] = useState(false)
  const [erreur, setErreur] = useState<string | null>(null)

  const adresse = coachAdverse.trim()
  const adresseValide = adresse === '' || ADRESSE_VALIDE.test(adresse)
  const nomFichier = nomFichierFeuille(match)
  const courriel = courrielFeuille(match, etat, adresseValide && adresse ? adresse : null)

  async function enregistrer() {
    setEnCours(true)
    try {
      const octets = await genererFeuillePdf(match, etat)
      await enregistrerFichier(octets, nomFichier)
    } catch (e) {
      setErreur(e instanceof Error ? e.message : String(e))
    } finally {
      setEnCours(false)
    }
  }

  return (
    <div className="envoi-feuille">
      <h2>Feuille de match</h2>
      <label>
        E-mail du coach adverse (facultatif)
        <input
          type="email"
          inputMode="email"
          autoComplete="email"
          value={coachAdverse}
          aria-invalid={!adresseValide}
          onChange={(e) => setCoachAdverse(e.target.value)}
        />
      </label>
      {!adresseValide && (
        <p role="alert" className="erreurs">
          Adresse e-mail invalide
        </p>
      )}
      <div className="actions-feuille">
        <button className="btn btn-principal" disabled={enCours} onClick={() => void enregistrer()}>
          {enCours ? 'Préparation…' : 'Enregistrer le PDF'}
        </button>
        {adresseValide ? (
          <a className="btn" href={courriel.lien}>
            Préparer l'e-mail
          </a>
        ) : (
          <button className="btn" disabled>
            Préparer l'e-mail
          </button>
        )}
      </div>
      <p className="aide">
        Joignez le fichier <code>{nomFichier}</code> à l’e-mail.
      </p>
      {erreur && (
        <Dialogue
          titre="Feuille impossible à générer"
          actions={
            <button className="btn" onClick={() => setErreur(null)}>
              Fermer
            </button>
          }
        >
          <p>{erreur}</p>
        </Dialogue>
      )}
    </div>
  )
}
