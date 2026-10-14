import { useLiveQuery } from 'dexie-react-hooks'
import { useState } from 'react'
import { listerClubsAvecEffectif } from '../../storage/clubs'
import { IconeChevron, IconeLienExterne } from '../commun/Icones'
import { pluriel } from '../format'
import { DialogueClub } from './DialogueClub'
import { FicheClub } from './FicheClub'
import { ImportWebaffiligue } from './ImportWebaffiligue'

/** Accès direct : le menu Statistiques et Extractions de LiguAsso ne s'ouvre pas sous Firefox. */
const EXTRACTION_LIGUASSO = 'https://www.liguasso.org/LAPOOL5/Pages/Private/Extractions/AdhExtract.aspx'

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
        <p className="sous-titre">Aucun club pour l'instant. Importez un export LiguAsso ou créez un club.</p>
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
      <div className="note-lien">
        <p className="sous-titre">
          L'export se récupère sur LiguAsso : Statistiques et Extractions → Extractions → Extraction adhérents, avec
          le type de sortie « Sortie simple Ufolep ».
        </p>
        <a className="btn" href={EXTRACTION_LIGUASSO} target="_blank" rel="noopener noreferrer">
          <IconeLienExterne />
          Ouvrir l'extraction des adhérents
        </a>
      </div>
      {creation && <DialogueClub club={null} onFermer={() => setCreation(false)} />}
    </section>
  )
}
