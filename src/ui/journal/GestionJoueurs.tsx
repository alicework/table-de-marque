import { useState } from 'react'
import { ajouterJoueurAuMatch, changerNumero } from '../../domain/equipe'
import { parNumero } from '../../domain/match'
import { EQUIPES, type Civilite, type EquipeId, type JoueurMatch, type Match } from '../../domain/types'
import { Dialogue } from '../commun/Dialogue'
import { lireNumero } from '../preparation/brouillon'
import type { Appliquer } from '../useMatch'

type Edition = { type: 'numero'; equipe: EquipeId; joueur: JoueurMatch } | { type: 'ajout'; equipe: EquipeId } | null

interface Props {
  match: Match
  appliquer: Appliquer
}

export function GestionJoueurs({ match, appliquer }: Props) {
  const [edition, setEdition] = useState<Edition>(null)
  const fermer = () => setEdition(null)

  return (
    <div className="gestion-joueurs">
      {EQUIPES.map((equipe) => {
        const nom = match.equipes[equipe].nom
        return (
          <section key={equipe} className={`carte equipe-${equipe}`} aria-label={`Joueurs ${nom}`}>
            <h2 className="titre-carte">
              <i className="couleur-equipe" aria-hidden="true" />
              {nom}
            </h2>
            <ul className="liste-joueurs">
              {[...match.equipes[equipe].joueurs].sort(parNumero).map((joueur) => (
                <li key={joueur.id}>
                  <span>{[`n°${joueur.numero}`, joueur.prenom, joueur.nom].filter(Boolean).join(' ')}</span>
                  <button
                    className="btn btn-discret"
                    onClick={() => setEdition({ type: 'numero', equipe, joueur })}
                  >
                    Changer le n°{joueur.numero}
                  </button>
                </li>
              ))}
            </ul>
            <button className="btn" onClick={() => setEdition({ type: 'ajout', equipe })}>
              Ajouter un joueur
            </button>
          </section>
        )
      })}
      {edition?.type === 'numero' && (
        <DialogueNumero
          joueur={edition.joueur}
          onValider={(numero) => appliquer((m) => changerNumero(m, edition.equipe, edition.joueur.id, numero))}
          onFermer={fermer}
        />
      )}
      {edition?.type === 'ajout' && (
        <DialogueAjout
          nomEquipe={match.equipes[edition.equipe].nom}
          onValider={(joueur) => appliquer((m) => ajouterJoueurAuMatch(m, edition.equipe, joueur))}
          onFermer={fermer}
        />
      )}
    </div>
  )
}

interface PropsNumero {
  joueur: JoueurMatch
  onValider: (numero: number) => Promise<string | null>
  onFermer: () => void
}

function DialogueNumero({ joueur, onValider, onFermer }: PropsNumero) {
  const [saisie, setSaisie] = useState(String(joueur.numero))
  const [erreur, setErreur] = useState<string | null>(null)

  async function valider() {
    const resultat = await onValider(lireNumero(saisie))
    if (resultat) {
      setErreur(resultat)
    } else {
      onFermer()
    }
  }

  return (
    <Dialogue
      titre={`Changer le n°${joueur.numero}`}
      actions={
        <>
          <button className="btn btn-principal" onClick={() => void valider()}>
            Enregistrer
          </button>
          <button className="btn" onClick={onFermer}>
            Annuler
          </button>
        </>
      }
    >
      <label>
        Nouveau n°
        <input inputMode="numeric" value={saisie} onChange={(e) => setSaisie(e.target.value)} />
      </label>
      {erreur && (
        <p role="alert" className="erreurs">
          {erreur}
        </p>
      )}
    </Dialogue>
  )
}

interface PropsAjout {
  nomEquipe: string
  onValider: (joueur: Omit<JoueurMatch, 'id'>) => Promise<string | null>
  onFermer: () => void
}

function DialogueAjout({ nomEquipe, onValider, onFermer }: PropsAjout) {
  const [numero, setNumero] = useState('')
  const [nom, setNom] = useState('')
  const [prenom, setPrenom] = useState('')
  const [licence, setLicence] = useState('')
  const [civilite, setCivilite] = useState<Civilite>(null)
  const [erreur, setErreur] = useState<string | null>(null)

  async function valider() {
    const resultat = await onValider({
      numero: lireNumero(numero),
      nom: nom.trim(),
      prenom: prenom.trim(),
      licence: licence.trim(),
      civilite,
    })
    if (resultat) {
      setErreur(resultat)
    } else {
      onFermer()
    }
  }

  return (
    <Dialogue
      titre={`Ajouter un joueur — ${nomEquipe}`}
      actions={
        <>
          <button className="btn btn-principal" onClick={() => void valider()}>
            Enregistrer
          </button>
          <button className="btn" onClick={onFermer}>
            Annuler
          </button>
        </>
      }
    >
      <label>
        N°
        <input inputMode="numeric" value={numero} onChange={(e) => setNumero(e.target.value)} />
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
        Licence
        <input value={licence} onChange={(e) => setLicence(e.target.value)} />
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
