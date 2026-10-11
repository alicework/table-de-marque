import { useRef, useState } from 'react'
import { verifierEquipe } from '../../domain/equipe'
import { nouveauMatch } from '../../domain/match'
import type { EquipeId } from '../../domain/types'
import { enregistrerMatch } from '../../storage/matchs'
import { aujourdhui } from '../format'
import { MESSAGE_ERREUR_STOCKAGE } from '../useMatch'
import { brouillonVersEquipe, brouillonVide, type BrouillonEquipe } from './brouillon'
import { EditeurEquipe } from './EditeurEquipe'

interface Props {
  onDemarre: (matchId: string) => void
  onRetour: () => void
  equipesInitiales?: Partial<Record<EquipeId, BrouillonEquipe>>
}

export function PreparationMatch({ onDemarre, onRetour, equipesInitiales }: Props) {
  const [date, setDate] = useState(() => aujourdhui())
  const [lieu, setLieu] = useState('')
  const [equipeA, setEquipeA] = useState(() => equipesInitiales?.A ?? brouillonVide())
  const [equipeB, setEquipeB] = useState(() => equipesInitiales?.B ?? brouillonVide())
  const [tentative, setTentative] = useState(false)
  const [erreurStockage, setErreurStockage] = useState<string | null>(null)
  const [enCours, setEnCours] = useState(false)
  const verrou = useRef(false)

  async function demarrer() {
    if (verrou.current) return
    setTentative(true)
    const equipes = { A: brouillonVersEquipe(equipeA), B: brouillonVersEquipe(equipeB) }
    const invalide = verifierEquipe(equipes.A).erreurs.length > 0 || verifierEquipe(equipes.B).erreurs.length > 0
    if (invalide) return
    verrou.current = true
    setEnCours(true)
    setErreurStockage(null)
    try {
      const match = await enregistrerMatch(nouveauMatch({ date, lieu: lieu.trim(), equipes }))
      onDemarre(match.id)
    } catch {
      setErreurStockage(MESSAGE_ERREUR_STOCKAGE)
      verrou.current = false
      setEnCours(false)
    }
  }

  return (
    <section className="ecran preparation">
      <header className="entete">
        <h1>Nouveau match</h1>
        <button className="btn" onClick={onRetour}>
          Retour
        </button>
      </header>
      <div className="infos-match">
        <label>
          Date
          <input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
        </label>
        <label>
          Lieu
          <input value={lieu} onChange={(e) => setLieu(e.target.value)} />
        </label>
      </div>
      <div className="equipes-preparation">
        <EditeurEquipe titre="Équipe A" valeur={equipeA} onChange={setEquipeA} afficherErreurs={tentative} />
        <EditeurEquipe titre="Équipe B" valeur={equipeB} onChange={setEquipeB} afficherErreurs={tentative} />
      </div>
      <button className="btn btn-principal" disabled={enCours} onClick={() => void demarrer()}>
        Commencer le match
      </button>
      {erreurStockage && (
        <p role="alert" className="erreurs">
          {erreurStockage}
        </p>
      )}
    </section>
  )
}
