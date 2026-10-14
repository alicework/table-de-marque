import { useLiveQuery } from 'dexie-react-hooks'
import { useState } from 'react'
import { listerClubsAvecEffectif } from '../../storage/clubs'
import { IconeChevron } from '../commun/Icones'
import { pluriel } from '../format'
import { DialogueClub } from './DialogueClub'
import { FicheClub } from './FicheClub'
import { ImportWebaffiligue } from './ImportWebaffiligue'

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
        <p className="sous-titre">Aucun club pour l'instant. Importez un export LigueAsso ou créez un club.</p>
      )}
      <ul className="liste-clubs">
        {clubs?.map(({ club, effectif }) => (
          <li key={club.id}>
            <button className="btn btn-club" onClick={() => setClubOuvert(club.id)}>
              <span className="nom-club">{club.nom}</span>
              <small className="puce">{pluriel(effectif, 'licencié')}</small>
              <IconeChevron />
            </button>
          </li>
        ))}
      </ul>
      <div className="actions-equipe">
        <button className="btn" onClick={() => setCreation(true)}>
          Nouveau club
        </button>
        <ImportWebaffiligue />
      </div>
      {creation && <DialogueClub club={null} onFermer={() => setCreation(false)} />}
    </section>
  )
}
