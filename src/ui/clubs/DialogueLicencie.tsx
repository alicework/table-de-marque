import { useState } from 'react'
import type { Licencie } from '../../domain/club'
import { nouvelId } from '../../domain/match'
import type { Civilite } from '../../domain/types'
import { enregistrerLicencie, ErreurLicenceEnDouble } from '../../storage/clubs'
import { Dialogue } from '../commun/Dialogue'
import { MESSAGE_ERREUR_STOCKAGE } from '../useMatch'

interface Props {
  clubId: string
  licencie: Licencie | null
  onFermer: () => void
}

export function DialogueLicencie({ clubId, licencie, onFermer }: Props) {
  const [licence, setLicence] = useState(licencie?.licence ?? '')
  const [nom, setNom] = useState(licencie?.nom ?? '')
  const [prenom, setPrenom] = useState(licencie?.prenom ?? '')
  const [civilite, setCivilite] = useState<Civilite>(licencie?.civilite ?? null)
  const [erreur, setErreur] = useState<string | null>(null)
  const [enCours, setEnCours] = useState(false)

  async function valider() {
    if (!nom.trim()) {
      setErreur('Le nom est obligatoire.')
      return
    }
    setEnCours(true)
    try {
      await enregistrerLicencie({
        id: licencie?.id ?? nouvelId(),
        clubId,
        licence: licence.trim(),
        nom: nom.trim(),
        prenom: prenom.trim(),
        civilite,
        typeLicence: licencie?.typeLicence ?? '',
      })
      onFermer()
    } catch (e) {
      setErreur(e instanceof ErreurLicenceEnDouble ? e.message : MESSAGE_ERREUR_STOCKAGE)
      setEnCours(false)
    }
  }

  return (
    <Dialogue
      titre={licencie ? 'Modifier le licencié' : 'Nouveau licencié'}
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
        Licence
        <input value={licence} onChange={(e) => setLicence(e.target.value)} />
      </label>
      <label>
        Nom
        <input value={nom} onChange={(e) => setNom(e.target.value)} />
      </label>
      <label>
        Prénom
        <input value={prenom} onChange={(e) => setPrenom(e.target.value)} />
      </label>
      <label>
        Civilité
        <select
          value={civilite ?? ''}
          onChange={(e) => setCivilite(e.target.value === '' ? null : (e.target.value as Civilite))}
        >
          <option value="">?</option>
          <option value="Mme">F</option>
          <option value="M">H</option>
        </select>
      </label>
      {erreur && (
        <p role="alert" className="erreurs">
          {erreur}
        </p>
      )}
    </Dialogue>
  )
}
