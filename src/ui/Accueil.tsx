import { useLiveQuery } from 'dexie-react-hooks'
import { useState } from 'react'
import { calculerEtat } from '../domain/etat'
import { libellePeriode } from '../domain/periodes'
import { matchEnCours } from '../storage/matchs'
import { Dialogue } from './commun/Dialogue'
import { IconeFleche, IconePersonnes, IconePlus, IconeQr } from './commun/Icones'

interface Props {
  onNouveauMatch: () => void
  onReprendre: (matchId: string) => void
  onClubs: () => void
  onPartager: () => void
}

export function Accueil({ onNouveauMatch, onReprendre, onClubs, onPartager }: Props) {
  const enCours = useLiveQuery(() => matchEnCours(), [])
  const [confirmation, setConfirmation] = useState(false)
  const etat = enCours ? calculerEtat(enCours) : null

  // Un second match en cours rendrait le premier inaccessible : on prévient avant.
  function demanderNouveauMatch() {
    if (enCours) {
      setConfirmation(true)
    } else {
      onNouveauMatch()
    }
  }

  return (
    <section className="ecran accueil">
      <header className="marque">
        <span className="logo" aria-hidden="true">
          <svg viewBox="0 0 512 512">
            <circle cx="256" cy="256" r="196" fill="#fff" />
            <path
              d="M60 256h392M256 60v392M118 118c70 70 70 206 0 276M394 118c-70 70-70 206 0 276"
              fill="none"
              stroke="var(--accent)"
              strokeWidth="22"
            />
          </svg>
        </span>
        <div>
          <h1>Table de marque</h1>
          <p className="sous-titre">Basket loisir UFOLEP 33</p>
        </div>
      </header>

      {enCours && etat && (
        <section className="carte carte-encours" aria-label="Match en cours">
          <p className="etiquette">
            <i aria-hidden="true" /> Match en cours
          </p>
          <div className="affiche">
            <span className="nom equipe-A">{enCours.equipes.A.nom}</span>
            <span className="score-accueil" aria-label="Score du match en cours">
              {etat.equipes.A.score} – {etat.equipes.B.score}
            </span>
            <span className="nom equipe-B">{enCours.equipes.B.nom}</span>
          </div>
          <p className="periode">{libellePeriode(etat.periode)}</p>
          <button className="btn btn-principal" onClick={() => onReprendre(enCours.id)}>
            Reprendre le match en cours
            <IconeFleche />
          </button>
        </section>
      )}

      <div className="actions-accueil">
        <button className={enCours ? 'btn large' : 'btn btn-principal large'} onClick={demanderNouveauMatch}>
          <span className="ico">
            <IconePlus />
          </span>
          Nouveau match
        </button>
        <button className="btn" onClick={onClubs}>
          <span className="ico">
            <IconePersonnes />
          </span>
          Clubs et licenciés
        </button>
        <button className="btn" onClick={onPartager}>
          <span className="ico">
            <IconeQr />
          </span>
          Partager une équipe
        </button>
      </div>

      {confirmation && (
        <Dialogue
          titre="Un match est en cours"
          actions={
            <>
              <button className="btn btn-principal" onClick={onNouveauMatch}>
                Créer un nouveau match
              </button>
              <button className="btn" onClick={() => setConfirmation(false)}>
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
