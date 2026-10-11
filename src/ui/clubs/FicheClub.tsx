import { useLiveQuery } from 'dexie-react-hooks'
import { useState } from 'react'
import { libelleLicencie, type Licencie } from '../../domain/club'
import { listerLicencies, lireClub, supprimerClub, supprimerLicencie } from '../../storage/clubs'
import { Dialogue } from '../commun/Dialogue'
import { pluriel } from '../format'
import { MESSAGE_ERREUR_STOCKAGE } from '../useMatch'
import { DialogueClub } from './DialogueClub'
import { DialogueLicencie } from './DialogueLicencie'

type Edition =
  | { type: 'club' }
  | { type: 'licencie'; licencie: Licencie | null }
  | { type: 'suppressionLicencie'; licencie: Licencie }
  | { type: 'suppressionClub' }
  | null

interface Props {
  clubId: string
  onRetour: () => void
}

const CIVILITES = { Mme: 'F', M: 'H' } as const

export function FicheClub({ clubId, onRetour }: Props) {
  const club = useLiveQuery(() => lireClub(clubId), [clubId])
  const licencies = useLiveQuery(() => listerLicencies(clubId), [clubId])
  const [edition, setEdition] = useState<Edition>(null)
  const [suppressionEnCours, setSuppressionEnCours] = useState(false)
  const [erreurSuppression, setErreurSuppression] = useState<string | null>(null)
  const fermer = () => {
    setEdition(null)
    setErreurSuppression(null)
  }

  // Une panne de stockage doit se voir : le dialogue reste ouvert avec le message.
  async function confirmerSuppression(supprimer: () => Promise<void>, apres: () => void) {
    setSuppressionEnCours(true)
    setErreurSuppression(null)
    try {
      await supprimer()
      apres()
    } catch {
      setErreurSuppression(MESSAGE_ERREUR_STOCKAGE)
    } finally {
      setSuppressionEnCours(false)
    }
  }

  if (!club || !licencies) return <p className="chargement">Chargement…</p>

  return (
    <section className="ecran fiche-club">
      <header className="entete">
        <h1>{club.nom}</h1>
        <button className="btn" onClick={onRetour}>
          Retour
        </button>
      </header>
      <p className="sous-titre">
        {club.numeroAssociation ? `N° d'association ${club.numeroAssociation} · ` : ''}
        Couleur : {club.couleurParDefaut || '—'}
      </p>
      <div className="actions-equipe">
        <button className="btn" onClick={() => setEdition({ type: 'club' })}>
          Modifier le club
        </button>
        <button className="btn btn-danger" onClick={() => setEdition({ type: 'suppressionClub' })}>
          Supprimer le club
        </button>
      </div>

      <h2>Licenciés ({licencies.length})</h2>
      <button className="btn btn-principal" onClick={() => setEdition({ type: 'licencie', licencie: null })}>
        Ajouter un licencié
      </button>
      <ul className="liste-joueurs" aria-label="Licenciés">
        {licencies.map((licencie) => {
          const libelle = libelleLicencie(licencie)
          return (
            <li key={licencie.id}>
              <span>{libelle}</span>
              <span className="journal-score">
                {licencie.licence || 'sans licence'} · {licencie.civilite ? CIVILITES[licencie.civilite] : '?'}
              </span>
              <span className="journal-actions">
                <button
                  className="btn btn-discret"
                  aria-label={`Modifier ${libelle}`}
                  onClick={() => setEdition({ type: 'licencie', licencie })}
                >
                  Modifier
                </button>
                <button
                  className="btn btn-discret"
                  aria-label={`Supprimer ${libelle}`}
                  onClick={() => setEdition({ type: 'suppressionLicencie', licencie })}
                >
                  Supprimer
                </button>
              </span>
            </li>
          )
        })}
      </ul>

      {edition?.type === 'club' && <DialogueClub club={club} onFermer={fermer} />}
      {edition?.type === 'licencie' && (
        <DialogueLicencie clubId={clubId} licencie={edition.licencie} onFermer={fermer} />
      )}
      {edition?.type === 'suppressionLicencie' && (
        <Dialogue
          titre="Supprimer ce licencié ?"
          actions={
            <>
              <button
                className="btn btn-danger"
                disabled={suppressionEnCours}
                onClick={() => void confirmerSuppression(() => supprimerLicencie(edition.licencie.id), fermer)}
              >
                Supprimer
              </button>
              <button className="btn" onClick={fermer}>
                Annuler
              </button>
            </>
          }
        >
          <p>{libelleLicencie(edition.licencie)}</p>
          {erreurSuppression && (
            <p role="alert" className="erreurs">
              {erreurSuppression}
            </p>
          )}
        </Dialogue>
      )}
      {edition?.type === 'suppressionClub' && (
        <Dialogue
          titre="Supprimer le club ?"
          actions={
            <>
              <button
                className="btn btn-danger"
                disabled={suppressionEnCours}
                onClick={() => void confirmerSuppression(() => supprimerClub(clubId), onRetour)}
              >
                Supprimer
              </button>
              <button className="btn" onClick={fermer}>
                Annuler
              </button>
            </>
          }
        >
          <p>
            Ses {pluriel(licencies.length, 'licencié')} seront aussi supprimés. Les matchs déjà joués ne changent pas.
          </p>
          {erreurSuppression && (
            <p role="alert" className="erreurs">
              {erreurSuppression}
            </p>
          )}
        </Dialogue>
      )}
    </section>
  )
}
