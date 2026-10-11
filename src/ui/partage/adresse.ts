/** Base des liens d'équipe : l'adresse de l'app, sans fragment. */
export function adresseApp(): string {
  return `${window.location.origin}${window.location.pathname}`
}
