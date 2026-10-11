import { useLiveQuery } from 'dexie-react-hooks'
import { useState } from 'react'
import { REGLES } from '../../domain/config'
import { verifierEquipe } from '../../domain/equipe'
import type { Civilite } from '../../domain/types'
import { listerClubs } from '../../storage/clubs'
import {
  appliquerSelection,
  brouillonVersEquipe,
  choisirClub,
  joueurBrouillonVide,
  type BrouillonEquipe,
  type JoueurBrouillon,
} from './brouillon'
import { DialogueSelection } from './DialogueSelection'

interface Props {
  titre: string
  valeur: BrouillonEquipe
  onChange: (brouillon: BrouillonEquipe) => void
  afficherErreurs: boolean
}

function libelleJoueur(joueur: JoueurBrouillon, index: number): string {
  const morceaux = [joueur.numero.trim() ? `n°${joueur.numero.trim()}` : '', joueur.prenom.trim(), joueur.nom.trim()]
  return morceaux.filter(Boolean).join(' ') || `Joueur ${index + 1}`
}

export function EditeurEquipe({ titre, valeur, onChange, afficherErreurs }: Props) {
  const clubs = useLiveQuery(() => listerClubs(), [])
  const [selection, setSelection] = useState(false)
  const maj = (modification: Partial<BrouillonEquipe>) => onChange({ ...valeur, ...modification })
  const majJoueur = (id: string, modification: Partial<JoueurBrouillon>) =>
    maj({ joueurs: valeur.joueurs.map((j) => (j.id === id ? { ...j, ...modification } : j)) })

  const equipe = brouillonVersEquipe(valeur)
  const verification = verifierEquipe(equipe)
  const valeurCoach = valeur.modeCoach === 'joueur' ? valeur.coachJoueurId : valeur.modeCoach

  return (
    <fieldset className="editeur-equipe">
      <legend>{titre}</legend>
      <label>
        Club
        <select
          value={valeur.clubId ?? ''}
          onChange={(e) => onChange(choisirClub(valeur, clubs?.find((club) => club.id === e.target.value) ?? null))}
        >
          <option value="">Saisie libre</option>
          {clubs?.map((club) => (
            <option key={club.id} value={club.id}>
              {club.nom}
            </option>
          ))}
        </select>
      </label>
      <div className="actions-equipe">
        <button type="button" className="btn" disabled={!valeur.clubId} onClick={() => setSelection(true)}>
          Choisir les joueurs du club
        </button>
      </div>
      <label>
        Nom de l'équipe
        <input value={valeur.nom} onChange={(e) => maj({ nom: e.target.value })} />
      </label>
      <label>
        Couleur
        <input value={valeur.couleur} onChange={(e) => maj({ couleur: e.target.value })} />
      </label>

      <table className="table-joueurs">
        <thead>
          <tr>
            <th>N°</th>
            <th>Nom</th>
            <th>Prénom</th>
            <th>Licence</th>
            <th>F/H</th>
            <th />
          </tr>
        </thead>
        <tbody>
          {valeur.joueurs.map((joueur, index) => (
            <tr key={joueur.id}>
              <td>
                <input
                  className="champ-numero"
                  aria-label={`N° joueur ${index + 1}`}
                  inputMode="numeric"
                  value={joueur.numero}
                  onChange={(e) => majJoueur(joueur.id, { numero: e.target.value })}
                />
              </td>
              <td>
                <input
                  aria-label={`Nom joueur ${index + 1}`}
                  value={joueur.nom}
                  onChange={(e) => majJoueur(joueur.id, { nom: e.target.value })}
                />
              </td>
              <td>
                <input
                  aria-label={`Prénom joueur ${index + 1}`}
                  value={joueur.prenom}
                  onChange={(e) => majJoueur(joueur.id, { prenom: e.target.value })}
                />
              </td>
              <td>
                <input
                  aria-label={`Licence joueur ${index + 1}`}
                  value={joueur.licence}
                  onChange={(e) => majJoueur(joueur.id, { licence: e.target.value })}
                />
              </td>
              <td>
                <select
                  aria-label={`Civilité joueur ${index + 1}`}
                  value={joueur.civilite ?? ''}
                  onChange={(e) =>
                    majJoueur(joueur.id, { civilite: e.target.value === '' ? null : (e.target.value as Civilite) })
                  }
                >
                  <option value="">?</option>
                  <option value="Mme">F</option>
                  <option value="M">H</option>
                </select>
              </td>
              <td>
                <button
                  type="button"
                  className="btn btn-discret"
                  aria-label={`Retirer joueur ${index + 1}`}
                  onClick={() => maj({ joueurs: valeur.joueurs.filter((j) => j.id !== joueur.id) })}
                >
                  ✕
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <button
        type="button"
        className="btn"
        disabled={valeur.joueurs.length >= REGLES.joueursMax}
        onClick={() => maj({ joueurs: [...valeur.joueurs, joueurBrouillonVide()] })}
      >
        Ajouter un joueur
      </button>

      <label>
        Coach
        <select
          value={valeurCoach}
          onChange={(e) => {
            const choix = e.target.value
            if (choix === 'aucun' || choix === 'libre') maj({ modeCoach: choix })
            else maj({ modeCoach: 'joueur', coachJoueurId: choix })
          }}
        >
          <option value="aucun">Aucun</option>
          {valeur.joueurs.map((joueur, index) => (
            <option key={joueur.id} value={joueur.id}>
              {libelleJoueur(joueur, index)}
            </option>
          ))}
          <option value="libre">Autre personne…</option>
        </select>
      </label>
      {valeur.modeCoach === 'libre' && (
        <label>
          Nom du coach
          <input value={valeur.coachNomLibre} onChange={(e) => maj({ coachNomLibre: e.target.value })} />
        </label>
      )}

      {equipe.joueurs.length > 0 && verification.avertissements.length > 0 && (
        <ul className="avertissements">
          {verification.avertissements.map((message) => (
            <li key={message}>{message}</li>
          ))}
        </ul>
      )}
      {afficherErreurs && verification.erreurs.length > 0 && (
        <ul className="erreurs">
          {verification.erreurs.map((message) => (
            <li key={message}>{message}</li>
          ))}
        </ul>
      )}

      {selection && valeur.clubId && (
        <DialogueSelection
          clubId={valeur.clubId}
          brouillon={valeur}
          onValider={(licencies, ids) => {
            onChange(appliquerSelection(valeur, licencies, ids))
            setSelection(false)
          }}
          onFermer={() => setSelection(false)}
        />
      )}
    </fieldset>
  )
}
