import { useRef, useState, type ReactNode } from 'react'
import { ajouterEvenement, annulerDernier, appliquerFinPeriode, rouvrirMatch } from '../../domain/commandes'
import { calculerEtat } from '../../domain/etat'
import type { EquipeId, NouvelEvenement } from '../../domain/types'
import { Dialogue } from '../commun/Dialogue'
import { useMatch } from '../useMatch'
import { ChoixJoueur } from './ChoixJoueur'
import { EcranAction } from './EcranAction'
import { FinPeriode } from './FinPeriode'
import { MatchTermine } from './MatchTermine'
import type { ActionEnAttente } from './types'

type Vue = { nom: 'action' } | { nom: 'joueur'; action: ActionEnAttente } | { nom: 'finPeriode' }

// Après le choix d'un joueur, le second tap d'un double tap tombe sur l'écran d'action : on l'ignore.
const DELAI_ANTI_DOUBLE_TAP_MS = 400

interface Props {
  matchId: string
  onAccueil: () => void
}

export function EcranMatch({ matchId, onAccueil }: Props) {
  const { match, appliquer, erreurStockage, effacerErreurStockage } = useMatch(matchId)
  const [vue, setVue] = useState<Vue>({ nom: 'action' })
  const ignorerJusqua = useRef(0)

  if (!match) return <p className="chargement">Chargement…</p>

  const etat = calculerEtat(match)
  const enregistrer = (evenement: NouvelEvenement) => {
    void appliquer((m) => ajouterEvenement(m, evenement))
  }
  const retourAction = () => setVue({ nom: 'action' })
  const siPasDoubleTap =
    <Args extends unknown[]>(fn: (...args: Args) => void) =>
    (...args: Args) => {
      if (Date.now() < ignorerJusqua.current) return
      fn(...args)
    }

  let contenu: ReactNode
  if (etat.termine) {
    contenu = (
      <MatchTermine match={match} etat={etat} onRouvrir={() => void appliquer(rouvrirMatch)} onAccueil={onAccueil} />
    )
  } else if (vue.nom === 'joueur') {
    const action = vue.action
    contenu = (
      <ChoixJoueur
        match={match}
        etat={etat}
        action={action}
        onChoisir={(joueurId) => {
          ignorerJusqua.current = Date.now() + DELAI_ANTI_DOUBLE_TAP_MS
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
      <>
        <EcranAction
          match={match}
          etat={etat}
          onAction={siPasDoubleTap((action: ActionEnAttente) => setVue({ nom: 'joueur', action }))}
          onTempsMort={siPasDoubleTap((equipe: EquipeId) => enregistrer({ type: 'tempsMort', equipe }))}
          onAnnulerDernier={siPasDoubleTap(() => void appliquer(annulerDernier))}
          onFinPeriode={siPasDoubleTap(() => setVue({ nom: 'finPeriode' }))}
          onAccueil={onAccueil}
        />
        {vue.nom === 'finPeriode' && (
          <FinPeriode
            etat={etat}
            onChoix={(choix) => {
              void appliquer((m) => appliquerFinPeriode(m, choix))
              retourAction()
            }}
            onAnnuler={retourAction}
          />
        )}
      </>
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
