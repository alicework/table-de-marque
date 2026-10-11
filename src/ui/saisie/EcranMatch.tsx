import { useState, type ReactNode } from 'react'
import { ajouterEvenement, annulerDernier } from '../../domain/commandes'
import { calculerEtat } from '../../domain/etat'
import type { NouvelEvenement } from '../../domain/types'
import { Dialogue } from '../commun/Dialogue'
import { useMatch } from '../useMatch'
import { ChoixJoueur } from './ChoixJoueur'
import { EcranAction } from './EcranAction'
import type { ActionEnAttente } from './types'

type Vue = { nom: 'action' } | { nom: 'joueur'; action: ActionEnAttente }

interface Props {
  matchId: string
  onAccueil: () => void
}

export function EcranMatch({ matchId, onAccueil }: Props) {
  const { match, appliquer, erreurStockage, effacerErreurStockage } = useMatch(matchId)
  const [vue, setVue] = useState<Vue>({ nom: 'action' })

  if (!match) return <p className="chargement">Chargement…</p>

  const etat = calculerEtat(match)
  const enregistrer = (evenement: NouvelEvenement) => {
    void appliquer((m) => ajouterEvenement(m, evenement))
  }
  const retourAction = () => setVue({ nom: 'action' })

  let contenu: ReactNode
  if (vue.nom === 'joueur') {
    const action = vue.action
    contenu = (
      <ChoixJoueur
        match={match}
        etat={etat}
        action={action}
        onChoisir={(joueurId) => {
          if (action.type === 'faute') {
            enregistrer({ type: 'faute', equipe: action.equipe, joueurId })
          } else if (joueurId !== null) {
            enregistrer({ type: 'panier', equipe: action.equipe, joueurId, valeur: action.valeur })
          }
          retourAction()
        }}
        onAnnuler={retourAction}
      />
    )
  } else {
    contenu = (
      <EcranAction
        match={match}
        etat={etat}
        onAction={(action) => setVue({ nom: 'joueur', action })}
        onTempsMort={(equipe) => enregistrer({ type: 'tempsMort', equipe })}
        onAnnulerDernier={() => void appliquer(annulerDernier)}
        onAccueil={onAccueil}
      />
    )
  }

  return (
    <>
      {contenu}
      {erreurStockage && (
        <Dialogue
          titre="Enregistrement impossible"
          actions={
            <button className="btn" onClick={effacerErreurStockage}>
              Compris
            </button>
          }
        >
          <p>{erreurStockage}</p>
        </Dialogue>
      )}
    </>
  )
}
