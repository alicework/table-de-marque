import { useLiveQuery } from 'dexie-react-hooks'
import { matchEnCours } from '../storage/matchs'

interface Props {
  onNouveauMatch: () => void
  onReprendre: (matchId: string) => void
}

export function Accueil({ onNouveauMatch, onReprendre }: Props) {
  const enCours = useLiveQuery(() => matchEnCours(), [])
  return (
    <section className="ecran accueil">
      <h1>Table de marque</h1>
      <p className="sous-titre">Basket loisir UFOLEP 33</p>
      {enCours && (
        <button className="btn btn-principal" onClick={() => onReprendre(enCours.id)}>
          Reprendre le match en cours
          <br />
          <small>
            {enCours.equipes.A.nom} – {enCours.equipes.B.nom}
          </small>
        </button>
      )}
      <button className="btn" onClick={onNouveauMatch}>
        Nouveau match
      </button>
    </section>
  )
}
