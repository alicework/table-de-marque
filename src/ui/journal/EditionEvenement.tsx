import { useState } from 'react'
import { parNumero } from '../../domain/match'
import { EQUIPES, type EquipeId, type Evenement, type Match } from '../../domain/types'
import { Dialogue } from '../commun/Dialogue'

export type EvenementModifiable = Extract<Evenement, { type: 'panier' | 'faute' | 'tempsMort' }>

const COACH = 'coach'

interface Props {
  match: Match
  evenement: EvenementModifiable
  onValider: (evenement: EvenementModifiable) => void
  onAnnuler: () => void
}

function joueurInitial(evenement: EvenementModifiable): string {
  if (evenement.type === 'panier') return evenement.joueurId
  if (evenement.type === 'faute') return evenement.joueurId ?? COACH
  return ''
}

export function EditionEvenement({ match, evenement, onValider, onAnnuler }: Props) {
  const [equipe, setEquipe] = useState<EquipeId>(evenement.equipe)
  const [valeur, setValeur] = useState<1 | 2 | 3>(evenement.type === 'panier' ? evenement.valeur : 2)
  const [joueurId, setJoueurId] = useState(joueurInitial(evenement))

  const joueurs = [...match.equipes[equipe].joueurs].sort(parNumero)
  const joueurValide =
    evenement.type === 'tempsMort' ||
    (joueurId === COACH ? evenement.type === 'faute' : joueurs.some((j) => j.id === joueurId))

  function valider() {
    if (evenement.type === 'panier') {
      onValider({ ...evenement, equipe, valeur, joueurId })
    } else if (evenement.type === 'faute') {
      onValider({ ...evenement, equipe, joueurId: joueurId === COACH ? null : joueurId })
    } else {
      onValider({ ...evenement, equipe })
    }
  }

  return (
    <Dialogue
      titre="Modifier l'action"
      actions={
        <>
          <button className="btn btn-principal" disabled={!joueurValide} onClick={valider}>
            Enregistrer
          </button>
          <button className="btn" onClick={onAnnuler}>
            Annuler
          </button>
        </>
      }
    >
      <label>
        Équipe
        <select
          value={equipe}
          onChange={(e) => {
            setEquipe(e.target.value as EquipeId)
            setJoueurId('')
          }}
        >
          {EQUIPES.map((id) => (
            <option key={id} value={id}>
              {match.equipes[id].nom}
            </option>
          ))}
        </select>
      </label>
      {evenement.type === 'panier' && (
        <label>
          Valeur
          <select value={valeur} onChange={(e) => setValeur(Number(e.target.value) as 1 | 2 | 3)}>
            <option value={1}>1 pt</option>
            <option value={2}>2 pts</option>
            <option value={3}>3 pts</option>
          </select>
        </label>
      )}
      {evenement.type !== 'tempsMort' && (
        <label>
          Joueur
          <select value={joueurId} onChange={(e) => setJoueurId(e.target.value)}>
            <option value="">— choisir —</option>
            {joueurs.map((joueur) => (
              <option key={joueur.id} value={joueur.id}>
                n°{joueur.numero}
              </option>
            ))}
            {evenement.type === 'faute' && <option value={COACH}>Coach</option>}
          </select>
        </label>
      )}
    </Dialogue>
  )
}
