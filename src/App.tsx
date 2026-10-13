import { useLiveQuery } from 'dexie-react-hooks'
import { useEffect, useState } from 'react'
import type { EquipeId } from './domain/types'
import { matchEnCours } from './storage/matchs'
import { Accueil } from './ui/Accueil'
import { EcranClubs } from './ui/clubs/EcranClubs'
import { EcranEquipeRecue } from './ui/import/EcranEquipeRecue'
import { MiseAJour } from './ui/MiseAJour'
import { EcranPartage } from './ui/partage/EcranPartage'
import { partageVersBrouillon, type BrouillonEquipe } from './ui/preparation/brouillon'
import { PreparationMatch } from './ui/preparation/PreparationMatch'
import { EcranMatch } from './ui/saisie/EcranMatch'

type Ecran =
  | { nom: 'chargement' }
  | { nom: 'accueil' }
  | { nom: 'preparation'; initiales?: Partial<Record<EquipeId, BrouillonEquipe>> }
  | { nom: 'match'; matchId: string }
  | { nom: 'clubs' }
  | { nom: 'partage' }
  | { nom: 'equipeRecue'; code: string }

interface Props {
  /** Code d'équipe lu dans l'adresse au démarrage (lien partagé). */
  codeEquipe?: string | null
}

export default function App({ codeEquipe = null }: Props) {
  const [ecran, setEcran] = useState<Ecran>(() =>
    codeEquipe !== null ? { nom: 'equipeRecue', code: codeEquipe } : { nom: 'chargement' },
  )
  const enCours = useLiveQuery(() => matchEnCours(), [])
  // Recharger ne doit jamais interrompre un match ni perdre le formulaire de préparation.
  const miseAJourAutorisee = ecran.nom === 'accueil' && !enCours

  useEffect(() => {
    // Un lien d'équipe prime sur la reprise du match en cours (l'écran est déjà initialisé ci-dessus).
    if (codeEquipe !== null) return
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
  }, [codeEquipe])

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
          onPartager={() => setEcran({ nom: 'partage' })}
        />
      )}
      {ecran.nom === 'preparation' && (
        <PreparationMatch onDemarre={ouvrirMatch} onRetour={allerAccueil} equipesInitiales={ecran.initiales} />
      )}
      {ecran.nom === 'match' && <EcranMatch key={ecran.matchId} matchId={ecran.matchId} onAccueil={allerAccueil} />}
      {ecran.nom === 'clubs' && <EcranClubs onRetour={allerAccueil} />}
      {ecran.nom === 'partage' && <EcranPartage onRetour={allerAccueil} />}
      {ecran.nom === 'equipeRecue' && (
        <EcranEquipeRecue
          codeInitial={ecran.code}
          onRetour={allerAccueil}
          onUtiliser={(cote, equipe) =>
            setEcran({ nom: 'preparation', initiales: { [cote]: partageVersBrouillon(equipe) } })
          }
        />
      )}
      <MiseAJour autorisee={miseAJourAutorisee} />
    </main>
  )
}
