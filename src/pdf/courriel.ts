import { ADRESSE_COMITE } from '../domain/config'
import type { EtatMatch } from '../domain/etat'
import type { EquipeId, Match } from '../domain/types'
import { mentionProlongation } from './modele'
import { formaterDateCourte, formaterDateLongue, slug } from './texte'

export interface CourrielFeuille {
  a: string
  cc: string | null
  objet: string
  corps: string
  /** Lien mailto: complet, encodé */
  lien: string
}

/** « 2026-10-16_ST-DELPHIN-GRADIGNAN.pdf » : date, puis noms sans accent ni espace. */
export function nomFichierFeuille(match: Match): string {
  const date = /^\d{4}-\d{2}-\d{2}$/.test(match.date) ? match.date : 'sans-date'
  const nom = (equipe: EquipeId) => slug(match.equipes[equipe].nom) || 'equipe'
  return `${date}_${nom('A')}-${nom('B')}.pdf`
}

export function courrielFeuille(match: Match, etat: EtatMatch, coachAdverse: string | null): CourrielFeuille {
  const nomA = match.equipes.A.nom
  const nomB = match.equipes.B.nom
  const scoreA = etat.equipes.A.score
  const scoreB = etat.equipes.B.score
  const mention = mentionProlongation(etat)
  const lieu = match.lieu.trim()
  const dateLongue = formaterDateLongue(match.date)
  const dateCourte = formaterDateCourte(match.date)

  const quand = [dateLongue && `du ${dateLongue}`, lieu && `à ${lieu}`].filter(Boolean).join(' ')
  const objet = ['Feuille de match UFOLEP 33', dateCourte, `${nomA} ${scoreA}–${scoreB} ${nomB}`]
    .filter(Boolean)
    .join(' — ')
  const corps = [
    'Bonjour,',
    '',
    `Veuillez trouver ci-joint la feuille du match${quand ? ` ${quand}` : ''} :`,
    `${nomA} ${scoreA} – ${scoreB} ${nomB}${mention ? ` (${mention})` : ''}.`,
    '',
    'Cordialement,',
    'La table de marque',
  ].join('\r\n')

  // Pas d'URLSearchParams : il encode l'espace en « + », que les messageries n'interprètent pas.
  const parametres = [
    coachAdverse ? `cc=${encodeURIComponent(coachAdverse)}` : null,
    `subject=${encodeURIComponent(objet)}`,
    `body=${encodeURIComponent(corps)}`,
  ]
    .filter(Boolean)
    .join('&')

  return { a: ADRESSE_COMITE, cc: coachAdverse, objet, corps, lien: `mailto:${ADRESSE_COMITE}?${parametres}` }
}
