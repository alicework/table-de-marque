import { useState, type ReactNode } from 'react'
import {
  ajouterEvenement,
  annulerDernier,
  appliquerFinPeriode,
  definirPossession,
  rouvrirMatch,
} from '../../domain/commandes'
import { calculerEtat } from '../../domain/etat'
import { PAUSES } from '../../domain/config'
import { pauseAvant, periodeSuivante, type ChoixFinPeriode } from '../../domain/periodes'
import type { EquipeId, NouvelEvenement } from '../../domain/types'
import { Dialogue } from '../commun/Dialogue'
import { useGardeDoubleTap } from '../commun/gardeDoubleTap'
import { preparerSon } from '../commun/signal'
import { Journal } from '../journal/Journal'
import { useMatch } from '../useMatch'
import { ChoixJoueur } from './ChoixJoueur'
import { EcranAction } from './EcranAction'
import { FinPeriode } from './FinPeriode'
import { MatchTermine } from './MatchTermine'
import { Minuteur } from './Minuteur'
import type { ActionEnAttente } from './types'

type Vue = { nom: 'action' } | { nom: 'joueur'; action: ActionEnAttente } | { nom: 'finPeriode' } | { nom: 'journal' }

/** Popup de compte à rebours ; `fin` en ms. État d'écran, jamais enregistré dans le match. */
type EtatMinuteur = { titre: string; fin: number }

/** Horodatage de fin d'un décompte lancé maintenant. */
const echeance = (secondes: number) => Date.now() + secondes * 1000

interface Props {
  matchId: string
  onAccueil: () => void
}

export function EcranMatch({ matchId, onAccueil }: Props) {
  const { match, appliquer, erreurStockage, effacerErreurStockage } = useMatch(matchId)
  const [vue, setVue] = useState<Vue>({ nom: 'action' })
  const [minuteur, setMinuteur] = useState<EtatMinuteur | null>(null)
  // Une seule garde pour toutes les vues : le second tap d'un double tap tombe souvent sur l'écran suivant.
  const garder = useGardeDoubleTap()

  if (!match) return <p className="chargement">Chargement…</p>

  const etat = calculerEtat(match)
  const enregistrer = (evenement: NouvelEvenement) => {
    void appliquer((m) => ajouterEvenement(m, evenement))
  }
  const retourAction = () => setVue({ nom: 'action' })
  // Appelé dans le gestionnaire du tap : Safari iOS n'autorise le son qu'à ce moment-là.
  const lancerMinuteur = (titre: string, secondes: number) => {
    preparerSon()
    setMinuteur({ titre, fin: echeance(secondes) })
  }

  let contenu: ReactNode
  if (vue.nom === 'journal') {
    contenu = <Journal match={match} etat={etat} appliquer={appliquer} garder={garder} onRetour={retourAction} />
  } else if (etat.termine) {
    contenu = (
      <MatchTermine
        match={match}
        appliquer={appliquer}
        onRouvrir={garder(() => void appliquer(rouvrirMatch))}
        onAccueil={onAccueil}
      />
    )
  } else if (vue.nom === 'joueur') {
    const action = vue.action
    contenu = (
      <ChoixJoueur
        match={match}
        etat={etat}
        action={action}
        garder={garder}
        onChoisir={(joueurId) => {
          if (action.type === 'faute') {
            enregistrer({ type: 'faute', equipe: action.equipe, joueurId })
          } else if (joueurId !== null) {
            enregistrer({ type: 'panier', equipe: action.equipe, joueurId, valeur: action.valeur })
          }
          retourAction()
        }}
        onAnnuler={garder(retourAction)}
      />
    )
  } else {
    contenu = (
      <>
        <EcranAction
          match={match}
          etat={etat}
          onAction={garder((action: ActionEnAttente) => setVue({ nom: 'joueur', action }))}
          onTempsMort={garder((equipe: EquipeId) => {
            enregistrer({ type: 'tempsMort', equipe })
            lancerMinuteur(`Temps mort — ${match.equipes[equipe].nom}`, PAUSES.tempsMort)
          })}
          onAnnulerDernier={garder(() => void appliquer(annulerDernier))}
          onFinPeriode={garder(() => setVue({ nom: 'finPeriode' }))}
          onJournal={garder(() => setVue({ nom: 'journal' }))}
          onAccueil={onAccueil}
          onPossession={garder((equipe: EquipeId) => void appliquer((m) => definirPossession(m, equipe)))}
        />
        {vue.nom === 'finPeriode' && (
          <FinPeriode
            etat={etat}
            onChoix={garder((choix: ChoixFinPeriode) => {
              void appliquer((m) => appliquerFinPeriode(m, choix))
              const pause = choix === 'finMatch' ? null : pauseAvant(periodeSuivante(etat.periode))
              if (pause) lancerMinuteur(pause.titre, pause.secondes)
              retourAction()
            })}
            onAnnuler={garder(retourAction)}
          />
        )}
        {minuteur && (
          <Minuteur
            key={minuteur.fin}
            titre={minuteur.titre}
            fin={minuteur.fin}
            onFermer={garder(() => setMinuteur(null))}
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
