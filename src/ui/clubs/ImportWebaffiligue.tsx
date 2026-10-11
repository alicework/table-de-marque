import { useState } from 'react'
import { appliquerImport, previsualiserImport, type BilanImportClub } from '../../storage/clubs'
import { ErreurExport, lireExportWebaffiligue, type ResultatLecture } from '../../webaffiligue/lireExport'
import { Dialogue } from '../commun/Dialogue'
import { lireOctets } from '../commun/fichiers'
import { MESSAGE_ERREUR_STOCKAGE } from '../useMatch'

type Etat =
  | { etape: 'repos' }
  | { etape: 'apercu'; lecture: ResultatLecture; bilans: BilanImportClub[] }
  | { etape: 'termine'; bilans: BilanImportClub[] }
  | { etape: 'erreur'; message: string }

function decrireBilan(bilan: BilanImportClub): string {
  const s = (n: number, marque: string) => (n > 1 ? marque : '')
  return (
    `${bilan.nom}${bilan.nouveauClub ? ' (nouveau club)' : ''} : ` +
    `${bilan.ajoutes} nouveau${s(bilan.ajoutes, 'x')}, ${bilan.misAJour} mis à jour, ` +
    `${bilan.inchanges} inchangé${s(bilan.inchanges, 's')}`
  )
}

function ListeBilans({ bilans }: { bilans: BilanImportClub[] }) {
  return (
    <ul className="liste-joueurs">
      {bilans.map((bilan, index) => (
        <li key={index}>{decrireBilan(bilan)}</li>
      ))}
    </ul>
  )
}

export function ImportWebaffiligue() {
  const [etat, setEtat] = useState<Etat>({ etape: 'repos' })
  const [enCours, setEnCours] = useState(false)
  const fermer = () => setEtat({ etape: 'repos' })

  async function lire(fichier: File | undefined) {
    if (!fichier) return
    try {
      const lecture = lireExportWebaffiligue(await lireOctets(fichier))
      setEtat({ etape: 'apercu', lecture, bilans: await previsualiserImport(lecture.clubs) })
    } catch (e) {
      setEtat({ etape: 'erreur', message: e instanceof ErreurExport ? e.message : 'Lecture du fichier impossible.' })
    }
  }

  async function importer(lecture: ResultatLecture) {
    setEnCours(true)
    try {
      setEtat({ etape: 'termine', bilans: await appliquerImport(lecture.clubs) })
    } catch {
      setEtat({ etape: 'erreur', message: MESSAGE_ERREUR_STOCKAGE })
    } finally {
      setEnCours(false)
    }
  }

  return (
    <>
      <label className="btn">
        Importer un export Webaffiligue
        <input
          type="file"
          accept=".csv,text/csv,application/vnd.ms-excel,text/comma-separated-values,text/plain"
          className="masque"
          onChange={(e) => {
            void lire(e.target.files?.[0])
            e.target.value = ''
          }}
        />
      </label>
      {etat.etape === 'apercu' && (
        <Dialogue
          titre="Import Webaffiligue"
          actions={
            <>
              <button className="btn btn-principal" disabled={enCours} onClick={() => void importer(etat.lecture)}>
                Importer
              </button>
              <button className="btn" onClick={fermer}>
                Annuler
              </button>
            </>
          }
        >
          <ListeBilans bilans={etat.bilans} />
          {etat.lecture.lignesIgnorees > 0 && (
            <p className="avertissements">
              {etat.lecture.lignesIgnorees} ligne{etat.lecture.lignesIgnorees > 1 ? 's' : ''} sans n° de licence
              ignorée{etat.lecture.lignesIgnorees > 1 ? 's' : ''}.
            </p>
          )}
        </Dialogue>
      )}
      {etat.etape === 'termine' && (
        <Dialogue
          titre="Import terminé"
          actions={
            <button className="btn btn-principal" onClick={fermer}>
              OK
            </button>
          }
        >
          <ListeBilans bilans={etat.bilans} />
        </Dialogue>
      )}
      {etat.etape === 'erreur' && (
        <Dialogue
          titre="Import impossible"
          actions={
            <button className="btn" onClick={fermer}>
              OK
            </button>
          }
        >
          <p role="alert">{etat.message}</p>
        </Dialogue>
      )}
    </>
  )
}
