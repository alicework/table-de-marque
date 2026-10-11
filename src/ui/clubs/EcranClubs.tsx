import { useLiveQuery } from 'dexie-react-hooks'
import { useState } from 'react'
import { listerClubsAvecEffectif } from '../../storage/clubs'
import { pluriel } from '../format'
import { DialogueClub } from './DialogueClub'
import { FicheClub } from './FicheClub'

export function EcranClubs({ onRetour }: { onRetour: () => void }) {
  const clubs = useLiveQuery(() => listerClubsAvecEffectif(), [])
  const [clubOuvert, setClubOuvert] = useState<string | null>(null)
  const [creation, setCreation] = useState(false)

  if (clubOuvert) return <FicheClub clubId={clubOuvert} onRetour={() => setClubOuvert(null)} />

  return (
    <section className="ecran clubs">
      <header className="entete">
        <h1>Clubs et licenciés</h1>
        <button className="btn" onClick={onRetour}>
          Retour
        </button>
      </header>
      {clubs?.length === 0 && (
        <p className="sous-titre">Aucun club pour l'instant. Importez un export Webaffiligue ou créez un club.</p>
      )}
      <ul className="liste-clubs">
        {clubs?.map(({ club, effectif }) => (
          <li key={club.id}>
            <button className="btn btn-discret" onClick={() => setClubOuvert(club.id)}>
              {club.nom} <small>{pluriel(effectif, 'licencié')}</small>
            </button>
          </li>
        ))}
      </ul>
      <div className="actions-equipe">
        <button className="btn" onClick={() => setCreation(true)}>
          Nouveau club
        </button>
      </div>
      {creation && <DialogueClub club={null} onFermer={() => setCreation(false)} />}
    </section>
  )
}
