import { useLiveQuery } from 'dexie-react-hooks'
import { useEffect, useState } from 'react'
import { matchEnCours } from './storage/matchs'
import { Accueil } from './ui/Accueil'
import { EcranClubs } from './ui/clubs/EcranClubs'
import { MiseAJour } from './ui/MiseAJour'
import { PreparationMatch } from './ui/preparation/PreparationMatch'
import { EcranMatch } from './ui/saisie/EcranMatch'

type Ecran =
  | { nom: 'chargement' }
  | { nom: 'accueil' }
  | { nom: 'preparation' }
  | { nom: 'match'; matchId: string }
  | { nom: 'clubs' }

export default function App() {
  const [ecran, setEcran] = useState<Ecran>({ nom: 'chargement' })
  const enCours = useLiveQuery(() => matchEnCours(), [])
  // Recharger ne doit jamais interrompre un match ni perdre le formulaire de préparation.
  const miseAJourAutorisee = ecran.nom === 'accueil' && !enCours

  useEffect(() => {
    let actif = true
    matchEnCours()
      .then((match) => {
        if (actif) setEcran(match ? { nom: 'match', matchId: match.id } : { nom: 'accueil' })
      })
      .catch(() => {
        if (actif) setEcran({ nom: 'accueil' })
      })
    return () => {
      actif = false
    }
  }, [])

  const allerAccueil = () => setEcran({ nom: 'accueil' })
  const ouvrirMatch = (matchId: string) => setEcran({ nom: 'match', matchId })

  return (
    <main className="app">
      {ecran.nom === 'chargement' && <p className="chargement">Chargement…</p>}
      {ecran.nom === 'accueil' && (
        <Accueil
          onNouveauMatch={() => setEcran({ nom: 'preparation' })}
          onReprendre={ouvrirMatch}
          onClubs={() => setEcran({ nom: 'clubs' })}
        />
      )}
      {ecran.nom === 'preparation' && <PreparationMatch onDemarre={ouvrirMatch} onRetour={allerAccueil} />}
      {ecran.nom === 'match' && <EcranMatch key={ecran.matchId} matchId={ecran.matchId} onAccueil={allerAccueil} />}
      {ecran.nom === 'clubs' && <EcranClubs onRetour={allerAccueil} />}
      <MiseAJour autorisee={miseAJourAutorisee} />
    </main>
  )
}
