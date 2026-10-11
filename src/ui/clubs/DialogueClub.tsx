import { useState } from 'react'
import type { Club } from '../../domain/club'
import { nouvelId } from '../../domain/match'
import { enregistrerClub } from '../../storage/clubs'
import { Dialogue } from '../commun/Dialogue'
import { MESSAGE_ERREUR_STOCKAGE } from '../useMatch'

interface Props {
  club: Club | null
  onFermer: () => void
}

export function DialogueClub({ club, onFermer }: Props) {
  const [nom, setNom] = useState(club?.nom ?? '')
  const [couleur, setCouleur] = useState(club?.couleurParDefaut ?? '')
  const [erreur, setErreur] = useState<string | null>(null)
  const [enCours, setEnCours] = useState(false)

  async function valider() {
    if (!nom.trim()) {
      setErreur('Le nom du club est obligatoire.')
      return
    }
    setEnCours(true)
    try {
      await enregistrerClub({
        id: club?.id ?? nouvelId(),
        numeroAssociation: club?.numeroAssociation ?? null,
        nom: nom.trim(),
        couleurParDefaut: couleur.trim(),
      })
      onFermer()
    } catch {
      setErreur(MESSAGE_ERREUR_STOCKAGE)
      setEnCours(false)
    }
  }

  return (
    <Dialogue
      titre={club ? 'Modifier le club' : 'Nouveau club'}
      actions={
        <>
          <button className="btn btn-principal" disabled={enCours} onClick={() => void valider()}>
            Enregistrer
          </button>
          <button className="btn" onClick={onFermer}>
            Annuler
          </button>
        </>
      }
    >
      <label>
        Nom du club
        <input value={nom} onChange={(e) => setNom(e.target.value)} />
      </label>
      <label>
        Couleur par défaut
        <input value={couleur} onChange={(e) => setCouleur(e.target.value)} />
      </label>
      {erreur && (
        <p role="alert" className="erreurs">
          {erreur}
        </p>
      )}
    </Dialogue>
  )
}
