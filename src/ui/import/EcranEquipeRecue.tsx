import { useLiveQuery } from 'dexie-react-hooks'
import { useState } from 'react'
import { lireCodeEquipe, type EquipePartagee } from '../../roster-share/format'
import type { EquipeId } from '../../domain/types'
import { matchEnCours } from '../../storage/matchs'
import { Dialogue } from '../commun/Dialogue'
import { ApercuEquipe } from './ApercuEquipe'
import { ImportEquipe } from './ImportEquipe'

interface Props {
  codeInitial: string | null
  onUtiliser: (cote: EquipeId, equipe: EquipePartagee) => void
  onRetour: () => void
}

function lectureInitiale(code: string | null): { equipe: EquipePartagee | null; erreur: string | null } {
  if (code === null) return { equipe: null, erreur: null }
  try {
    return { equipe: lireCodeEquipe(code), erreur: null }
  } catch (e) {
    return { equipe: null, erreur: e instanceof Error ? e.message : String(e) }
  }
}

export function EcranEquipeRecue({ codeInitial, onUtiliser, onRetour }: Props) {
  const [initiale] = useState(() => lectureInitiale(codeInitial))
  const [equipe, setEquipe] = useState<EquipePartagee | null>(initiale.equipe)
  const [message, setMessage] = useState<string | null>(null)
  const enCours = useLiveQuery(() => matchEnCours(), [])
  const [confirmation, setConfirmation] = useState<EquipeId | null>(null)

  // Un second match en cours rendrait le premier inaccessible : on prévient avant (comme sur l'accueil).
  function demanderNouveauMatch(cote: EquipeId, recue: EquipePartagee) {
    if (enCours) {
      setConfirmation(cote)
    } else {
      onUtiliser(cote, recue)
    }
  }

  async function copierCode() {
    if (codeInitial === null) return
    try {
      await navigator.clipboard.writeText(codeInitial)
      setMessage('Code copié.')
    } catch {
      setMessage(`Copie impossible. Code : ${codeInitial}`)
    }
  }

  return (
    <section className="ecran equipe-recue">
      <header className="entete">
        <h1>Équipe reçue</h1>
        <button className="btn" onClick={onRetour}>
          Retour
        </button>
      </header>
      {initiale.erreur && !equipe && (
        <p role="alert" className="erreurs">
          {initiale.erreur}
        </p>
      )}
      {equipe ? (
        <>
          <ApercuEquipe equipe={equipe} />
          <div className="actions-equipe">
            <button className="btn btn-principal" onClick={() => demanderNouveauMatch('A', equipe)}>
              Nouveau match : en équipe A
            </button>
            <button className="btn btn-principal" onClick={() => demanderNouveauMatch('B', equipe)}>
              Nouveau match : en équipe B
            </button>
          </div>
          {initiale.equipe && (
            <div className="note-lien">
              <p className="sous-titre">
                Ce lien s'est peut-être ouvert dans le navigateur plutôt que dans l'application installée. Dans ce cas,
                copiez le code puis, dans l'application, choisissez « Importer une équipe ».
              </p>
              <button className="btn" onClick={() => void copierCode()}>
                Copier le code
              </button>
              {message && <p role="status">{message}</p>}
            </div>
          )}
        </>
      ) : (
        <ImportEquipe onImporter={setEquipe} onFermer={onRetour} />
      )}
      {equipe && confirmation && (
        <Dialogue
          titre="Un match est en cours"
          actions={
            <>
              <button className="btn btn-principal" onClick={() => onUtiliser(confirmation, equipe)}>
                Créer un nouveau match
              </button>
              <button className="btn" onClick={() => setConfirmation(null)}>
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
