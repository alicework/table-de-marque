import { useLiveQuery } from 'dexie-react-hooks'
import { useState } from 'react'
import { libelleLicencie, type Licencie } from '../../domain/club'
import { REGLES } from '../../domain/config'
import { listerLicencies } from '../../storage/clubs'
import { Dialogue } from '../commun/Dialogue'
import { estVide, type BrouillonEquipe } from './brouillon'

interface Props {
  clubId: string
  brouillon: BrouillonEquipe
  onValider: (licencies: Licencie[], ids: Set<string>) => void
  onFermer: () => void
}

const normaliser = (texte: string) =>
  texte
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()

export function DialogueSelection({ clubId, brouillon, onValider, onFermer }: Props) {
  const licencies = useLiveQuery(() => listerLicencies(clubId), [clubId])
  const [ids, setIds] = useState(
    () => new Set(brouillon.joueurs.flatMap((joueur) => (joueur.licencieId ? [joueur.licencieId] : []))),
  )
  const [recherche, setRecherche] = useState('')

  const manuels = brouillon.joueurs.filter((joueur) => joueur.licencieId === null && !estVide(joueur)).length
  const total = manuels + ids.size
  const plein = total >= REGLES.joueursMax
  const filtre = normaliser(recherche.trim())
  const visibles = (licencies ?? []).filter(
    (licencie) => !filtre || normaliser(`${licencie.prenom} ${licencie.nom} ${licencie.licence}`).includes(filtre),
  )

  const basculer = (id: string) =>
    setIds((avant) => {
      const suivant = new Set(avant)
      if (suivant.has(id)) {
        suivant.delete(id)
      } else {
        suivant.add(id)
      }
      return suivant
    })

  return (
    <Dialogue
      titre="Choisir les joueurs"
      actions={
        <>
          <button className="btn btn-principal" onClick={() => onValider(licencies ?? [], ids)}>
            Valider
          </button>
          <button className="btn" onClick={onFermer}>
            Annuler
          </button>
        </>
      }
    >
      <label>
        Rechercher
        <input value={recherche} onChange={(e) => setRecherche(e.target.value)} />
      </label>
      <p className="sous-titre">
        {total} / {REGLES.joueursMax} joueurs
      </p>
      {licencies?.length === 0 && <p>Aucun licencié dans ce club.</p>}
      <ul className="liste-selection">
        {visibles.map((licencie) => (
          <li key={licencie.id}>
            <label className="case">
              <input
                type="checkbox"
                checked={ids.has(licencie.id)}
                disabled={!ids.has(licencie.id) && plein}
                onChange={() => basculer(licencie.id)}
              />
              {libelleLicencie(licencie)}
              {licencie.licence && <small> {licencie.licence}</small>}
            </label>
          </li>
        ))}
      </ul>
    </Dialogue>
  )
}
