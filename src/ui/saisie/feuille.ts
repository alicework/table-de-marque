import type { EtatMatch } from '../../domain/etat'
import type { Match } from '../../domain/types'
import type { PolicesFeuille } from '../../pdf/dessin'
import { composerFeuille } from '../../pdf/modele'
import policeGrasseUrl from '../../pdf/polices/Manrope-Bold.ttf?url'
import policeNormaleUrl from '../../pdf/polices/Manrope-Regular.ttf?url'

type ModuleDessin = typeof import('../../pdf/dessin')

async function lirePolice(url: string): Promise<Uint8Array> {
  const reponse = await fetch(url)
  if (!reponse.ok) throw new Error(`Police introuvable : ${url}`)
  return new Uint8Array(await reponse.arrayBuffer())
}

let chargement: Promise<[ModuleDessin, PolicesFeuille]> | null = null

/**
 * Charge pdf-lib et les polices (import dynamique), une seule fois. À appeler dès l'écran de fin :
 * le menu de partage natif exige un geste récent, la génération doit donc être brève au moment du clic.
 */
export function prechargerFeuille(): Promise<[ModuleDessin, PolicesFeuille]> {
  chargement ??= Promise.all([
    import('../../pdf/dessin'),
    Promise.all([lirePolice(policeNormaleUrl), lirePolice(policeGrasseUrl)]).then(([normale, grasse]) => ({
      normale,
      grasse,
    })),
  ]).catch((erreur: unknown) => {
    // Un échec (hors connexion avant le premier cache…) ne doit pas condamner les tentatives suivantes.
    chargement = null
    throw erreur
  })
  return chargement
}

/** Compose et dessine la feuille ; réutilise le préchargement s'il a eu lieu. */
export async function genererFeuillePdf(match: Match, etat: EtatMatch): Promise<Uint8Array> {
  const [{ dessinerFeuille }, polices] = await prechargerFeuille()
  return dessinerFeuille(composerFeuille(match, etat), polices)
}

function telecharger(fichier: File) {
  const url = URL.createObjectURL(fichier)
  const lien = document.createElement('a')
  lien.href = url
  lien.download = fichier.name
  document.body.append(lien)
  lien.click()
  lien.remove()
  // Révocation différée : Firefox et Safari annulent le téléchargement si l'URL disparaît trop tôt.
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

const estAbandon = (erreur: unknown) =>
  typeof erreur === 'object' && erreur !== null && 'name' in erreur && erreur.name === 'AbortError'

/** Menu de partage natif si l'appareil sait partager ce fichier (téléphones, tablettes), téléchargement sinon. */
export async function enregistrerFichier(octets: Uint8Array, nom: string): Promise<void> {
  const fichier = new File([new Uint8Array(octets)], nom, { type: 'application/pdf' })
  if (typeof navigator.canShare === 'function' && navigator.canShare({ files: [fichier] })) {
    try {
      await navigator.share({ files: [fichier], title: nom })
      return
    } catch (erreur) {
      if (estAbandon(erreur)) return
      // Partage annoncé mais refusé : on retombe sur le téléchargement.
    }
  }
  telecharger(fichier)
}
