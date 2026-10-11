import { useState } from 'react'
import { brouillonVide } from '../preparation/brouillon'
import { EditeurEquipe } from '../preparation/EditeurEquipe'

export function EcranPartage({ onRetour }: { onRetour: () => void }) {
  const [equipe, setEquipe] = useState(brouillonVide)
  return (
    <section className="ecran partage">
      <header className="entete">
        <h1>Partager une équipe</h1>
        <button className="btn" onClick={onRetour}>
          Retour
        </button>
      </header>
      <p className="sous-titre">
        Composez l'équipe du match, attribuez les n° si vous les connaissez, puis partagez-la avec la table de marque.
      </p>
      <EditeurEquipe titre="Équipe à partager" valeur={equipe} onChange={setEquipe} afficherErreurs={false} />
    </section>
  )
}
