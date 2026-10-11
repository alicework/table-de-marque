import { extraireCode, PARAMETRE_LIEN } from '../../roster-share/format'

/** Lu une seule fois au démarrage (main.tsx), puis retiré de l'adresse pour qu'un rechargement ne le rejoue pas. */
export function lireEtEffacerCodeEquipe(
  adresse: Location = window.location,
  historique: History = window.history,
): string | null {
  const fragment = adresse.hash
  if (!fragment.includes(`${PARAMETRE_LIEN}=`)) return null
  historique.replaceState(null, '', adresse.pathname + adresse.search)
  return extraireCode(fragment) ?? fragment
}
