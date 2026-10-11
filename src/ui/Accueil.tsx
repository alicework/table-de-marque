import { useLiveQuery } from 'dexie-react-hooks'
import { useState } from 'react'
import { matchEnCours } from '../storage/matchs'
import { Dialogue } from './commun/Dialogue'

interface Props {
  onNouveauMatch: () => void
  onReprendre: (matchId: string) => void
  onClubs: () => void
  onPartager: () => void
  onImporter: () => void
}

export function Accueil({ onNouveauMatch, onReprendre, onClubs, onPartager, onImporter }: Props) {
  const enCours = useLiveQuery(() => matchEnCours(), [])
  const [confirmation, setConfirmation] = useState(false)

  // Un second match en cours rendrait le premier inaccessible : on prévient avant.
  function demanderNouveauMatch() {
    if (enCours) {
      setConfirmation(true)
    } else {
      onNouveauMatch()
    }
  }

  return (
    <section className="ecran accueil">
      <h1>Table de marque</h1>
      <p className="sous-titre">Basket loisir UFOLEP 33</p>
      {enCours && (
        <button className="btn btn-principal" onClick={() => onReprendre(enCours.id)}>
          Reprendre le match en cours
          <br />
          <small>
            {enCours.equipes.A.nom} – {enCours.equipes.B.nom}
          </small>
        </button>
      )}
      <button className="btn" onClick={demanderNouveauMatch}>
        Nouveau match
      </button>
      <button className="btn" onClick={onClubs}>
        Clubs et licenciés
      </button>
      <button className="btn" onClick={onPartager}>
        Partager une équipe
      </button>
      <button className="btn" onClick={onImporter}>
        Importer une équipe
      </button>
      {confirmation && (
        <Dialogue
          titre="Un match est en cours"
          actions={
            <>
              <button className="btn btn-principal" onClick={onNouveauMatch}>
                Créer un nouveau match
              </button>
              <button className="btn" onClick={() => setConfirmation(false)}>
                Annuler
              </button>
            </>
          }
        >
          <p>Il restera enregistré mais ne sera plus repris automatiquement.</p>
        </Dialogue>
      )}
    </section>
  )
}
