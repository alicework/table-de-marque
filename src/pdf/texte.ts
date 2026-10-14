/** « 2026-10-16 » → date locale à midi, pour ne jamais changer de jour avec le fuseau ; null si mal formée. */
function dateLocale(iso: string): Date | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso)
  if (!m) return null
  const [annee, mois, jour] = [Number(m[1]), Number(m[2]), Number(m[3])]
  const date = new Date(annee, mois - 1, jour, 12)
  // Un 30 février « déborde » sur mars : on le refuse.
  return date.getMonth() === mois - 1 && date.getDate() === jour ? date : null
}

/** « 2026-10-16 » → « vendredi 16 octobre 2026 » ; chaîne vide si la date est absente ou mal formée. */
export function formaterDateLongue(iso: string): string {
  const date = dateLocale(iso)
  return date ? new Intl.DateTimeFormat('fr-FR', { dateStyle: 'full' }).format(date) : ''
}

/** « 2026-10-16 » ou une Date → « 16/10/2026 » ; chaîne vide si invalide. */
export function formaterDateCourte(valeur: string | Date): string {
  const date = typeof valeur === 'string' ? dateLocale(valeur) : valeur
  return date ? new Intl.DateTimeFormat('fr-FR', { dateStyle: 'short' }).format(date) : ''
}

/** « 21:05 » */
export function formaterHeure(date: Date): string {
  return new Intl.DateTimeFormat('fr-FR', { hour: '2-digit', minute: '2-digit' }).format(date)
}

/** Saison sportive de septembre à août : « 2026-10-16 » → « 2026-2027 », « 2027-03-01 » → « 2026-2027 ». */
export function saison(iso: string): string {
  const date = dateLocale(iso)
  if (!date) return ''
  const debut = date.getMonth() >= 8 ? date.getFullYear() : date.getFullYear() - 1
  return `${debut}-${debut + 1}`
}

/** « Villenave-d’Ornon » → « Villenave-d-Ornon » : sans accent, sans espace, pour un nom de fichier. */
export function slug(texte: string): string {
  return texte
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^A-Za-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}
