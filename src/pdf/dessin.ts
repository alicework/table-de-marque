import fontkit from '@pdf-lib/fontkit'
import { PDFDocument, PageSizes, rgb, type PDFFont, type PDFPage, type RGB } from 'pdf-lib'
import { JETONS_PDF, versRvb, type NomCouleur } from './couleurs'
import type { BlocEquipe, ModeleFeuille } from './modele'

export interface PolicesFeuille {
  normale: Uint8Array
  grasse: Uint8Array
}

const [LARGEUR_PAGE, HAUTEUR_PAGE] = PageSizes.A4
const MARGE = 36
const LARGEUR_UTILE = LARGEUR_PAGE - 2 * MARGE
const HAUTEUR_PIED = 24
/** Dernière ordonnée (depuis le haut) utilisable avant le pied de page. */
const BAS_UTILE = HAUTEUR_PAGE - MARGE - HAUTEUR_PIED
const LIGNE_MAX = 16
const LIGNE_MIN = 10
const CASES_FAUTES = 5
const CASE = 7
const PAS_CASE = 10

/** Hauteurs fixes (hors lignes de tableau), pour calculer la hauteur de ligne qui fait tenir la feuille sur une page. */
const HAUTEUR_EN_TETE = 48
const HAUTEUR_SCORE = 60
const HAUTEUR_TITRE_EQUIPE = 30
const HAUTEUR_TITRE_OFFICIELS = 16
/** Libellé 7 pt puis une case de 22 pt, assez haute pour une signature au stylo. */
const HAUTEUR_CASE_OFFICIEL = 33
const HAUTEUR_SIGNATURE = 22
const ESPACE = 12

type Alignement = 'gauche' | 'droite' | 'centre'

interface Colonne {
  titre: string
  largeur: number
  alignement?: Alignement
}

/** Cellule de tableau : texte, ou cases de fautes. */
type Cellule = string | { cases: number; exclu: boolean }

interface OptionsTexte {
  x: number
  /** Ligne de base, mesurée depuis le HAUT de la page */
  y: number
  taille: number
  police?: PDFFont
  couleur?: NomCouleur
  /** Si donnée, le texte est tronqué avec « … » pour tenir, et aligné dans cette largeur */
  largeur?: number
  alignement?: Alignement
}

function teinte(nom: NomCouleur): RGB {
  const [r, v, b] = versRvb(JETONS_PDF[nom])
  return rgb(r, v, b)
}

/** Curseur de dessin. `y` est mesuré depuis le haut de la page ; pdf-lib compte depuis le bas. */
class Feuille {
  readonly doc: PDFDocument
  readonly normale: PDFFont
  readonly grasse: PDFFont
  readonly pages: PDFPage[] = []
  page!: PDFPage
  y = MARGE
  private readonly jeux: Map<PDFFont, Set<number>>

  // Pas de propriétés de paramètre : le projet compile avec `erasableSyntaxOnly`.
  constructor(doc: PDFDocument, normale: PDFFont, grasse: PDFFont) {
    this.doc = doc
    this.normale = normale
    this.grasse = grasse
    this.jeux = new Map([normale, grasse].map((police) => [police, new Set(police.getCharacterSet())]))
    this.nouvellePage()
  }

  nouvellePage() {
    this.page = this.doc.addPage(PageSizes.A4)
    this.pages.push(this.page)
    this.y = MARGE
  }

  /** Passe à la page suivante si `hauteur` ne tient pas avant le pied de page. */
  assurerPlace(hauteur: number) {
    if (this.y + hauteur > BAS_UTILE) this.nouvellePage()
  }

  /** Remplace par « ? » les caractères absents de la police (emoji…). */
  nettoyer(texte: string, police: PDFFont): string {
    const jeu = this.jeux.get(police) ?? new Set<number>()
    return [...texte].map((c) => (jeu.has(c.codePointAt(0) ?? -1) ? c : '?')).join('')
  }

  /** Coupe avec « … » pour tenir dans `largeur`. */
  tronquer(texte: string, police: PDFFont, taille: number, largeur: number): string {
    let t = this.nettoyer(texte, police)
    if (police.widthOfTextAtSize(t, taille) <= largeur) return t
    const points = this.nettoyer('…', police)
    while (t.length > 0 && police.widthOfTextAtSize(`${t}${points}`, taille) > largeur) t = t.slice(0, -1)
    return `${t.trimEnd()}${points}`
  }

  texte(texte: string, options: OptionsTexte) {
    const police = options.police ?? this.normale
    const t =
      options.largeur === undefined
        ? this.nettoyer(texte, police)
        : this.tronquer(texte, police, options.taille, options.largeur)
    let x = options.x
    if (options.largeur !== undefined && options.alignement && options.alignement !== 'gauche') {
      const l = police.widthOfTextAtSize(t, options.taille)
      x = options.alignement === 'droite' ? options.x + options.largeur - l : options.x + (options.largeur - l) / 2
    }
    this.page.drawText(t, {
      x,
      y: HAUTEUR_PAGE - options.y,
      size: options.taille,
      font: police,
      color: teinte(options.couleur ?? 'texte'),
    })
  }

  /** `y` depuis le haut ; au moins un de `fond` / `bordure` doit être donné. */
  rectangle(x: number, y: number, largeur: number, hauteur: number, style: { fond?: NomCouleur; bordure?: NomCouleur }) {
    this.page.drawRectangle({
      x,
      y: HAUTEUR_PAGE - y - hauteur,
      width: largeur,
      height: hauteur,
      color: style.fond ? teinte(style.fond) : undefined,
      borderColor: style.bordure ? teinte(style.bordure) : undefined,
      borderWidth: style.bordure ? 0.5 : 0,
    })
  }

  /** Tableau pleine largeur : en-tête grisé (répété en haut d'une nouvelle page), lignes alternées. */
  tableau(colonnes: Colonne[], lignes: Cellule[][], hauteurLigne: number, taille: number) {
    const enTete = () =>
      this.ligneTableau(
        colonnes,
        colonnes.map((c) => c.titre),
        hauteurLigne,
        taille - 1,
        { fond: 'surface-2', police: this.grasse, couleur: 'texte-2' },
      )
    this.assurerPlace(hauteurLigne * 2)
    enTete()
    lignes.forEach((cellules, i) => {
      if (this.y + hauteurLigne > BAS_UTILE) {
        this.nouvellePage()
        enTete()
      }
      this.ligneTableau(colonnes, cellules, hauteurLigne, taille, { fond: i % 2 ? 'fond' : 'surface' })
    })
  }

  private ligneTableau(
    colonnes: Colonne[],
    cellules: Cellule[],
    hauteur: number,
    taille: number,
    style: { fond: NomCouleur; police?: PDFFont; couleur?: NomCouleur },
  ) {
    this.rectangle(MARGE, this.y, LARGEUR_UTILE, hauteur, { fond: style.fond })
    const base = this.y + hauteur / 2 + taille * 0.35
    let x = MARGE
    colonnes.forEach((colonne, i) => {
      const cellule = cellules[i] ?? ''
      if (typeof cellule === 'string') {
        this.texte(cellule, {
          x: x + 4,
          y: base,
          taille,
          police: style.police,
          couleur: style.couleur,
          largeur: colonne.largeur - 8,
          alignement: colonne.alignement,
        })
      } else {
        this.casesFautes(cellule, x + 4, this.y + (hauteur - CASE) / 2)
      }
      x += colonne.largeur
    })
    this.y += hauteur
  }

  private casesFautes(cellule: { cases: number; exclu: boolean }, x: number, y: number) {
    for (let i = 0; i < CASES_FAUTES; i++) {
      const pleine = i < cellule.cases
      const derniere = i === CASES_FAUTES - 1
      if (pleine) {
        this.rectangle(x + i * PAS_CASE, y, CASE, CASE, { fond: derniere && cellule.exclu ? 'danger' : 'faute' })
      } else {
        this.rectangle(x + i * PAS_CASE, y, CASE, CASE, { bordure: 'bordure' })
      }
    }
  }
}

/** Hauteur de ligne qui fait tenir tous les tableaux sur la première page, bornée entre LIGNE_MIN et LIGNE_MAX. */
function calculerHauteurLigne(modele: ModeleFeuille): number {
  const lignesPeriodes = 1 + 3 * modele.periodes.lignes.length
  const lignesEquipes = 2 + modele.equipes.A.joueurs.length + modele.equipes.B.joueurs.length
  const lignes = lignesPeriodes + lignesEquipes
  const fixe =
    HAUTEUR_EN_TETE +
    HAUTEUR_SCORE +
    2 * HAUTEUR_TITRE_EQUIPE +
    HAUTEUR_TITRE_OFFICIELS +
    Math.ceil(modele.officiels.length / 2) * HAUTEUR_CASE_OFFICIEL +
    4 * ESPACE
  const disponible = BAS_UTILE - MARGE - fixe
  return Math.max(LIGNE_MIN, Math.min(LIGNE_MAX, Math.floor(disponible / lignes)))
}

function dessinerEnTete(f: Feuille, m: ModeleFeuille) {
  const moitie = LARGEUR_UTILE / 2
  f.texte(m.titre, { x: MARGE, y: f.y + 20, taille: 22, police: f.grasse })
  f.texte(m.sousTitre, { x: MARGE, y: f.y + 36, taille: 10, couleur: 'texte-2' })
  f.texte(m.date, { x: MARGE + moitie, y: f.y + 20, taille: 11, police: f.grasse, largeur: moitie, alignement: 'droite' })
  if (m.lieu) {
    f.texte(m.lieu, {
      x: MARGE + moitie,
      y: f.y + 36,
      taille: 10,
      couleur: 'texte-2',
      largeur: moitie,
      alignement: 'droite',
    })
  }
  f.y += HAUTEUR_EN_TETE
}

function dessinerScore(f: Feuille, m: ModeleFeuille) {
  f.rectangle(MARGE, f.y, LARGEUR_UTILE, HAUTEUR_SCORE, { fond: 'accent-tint' })
  const tiers = LARGEUR_UTILE / 3
  const base = f.y + 38
  f.texte(m.score.nomA, {
    x: MARGE + 12,
    y: base,
    taille: 14,
    police: f.grasse,
    couleur: 'equipe-a',
    largeur: tiers - 12,
  })
  f.texte(`${m.score.scoreA} – ${m.score.scoreB}`, {
    x: MARGE + tiers,
    y: base,
    taille: 30,
    police: f.grasse,
    largeur: tiers,
    alignement: 'centre',
  })
  f.texte(m.score.nomB, {
    x: MARGE + 2 * tiers,
    y: base,
    taille: 14,
    police: f.grasse,
    couleur: 'equipe-b',
    largeur: tiers - 12,
    alignement: 'droite',
  })
  if (m.score.mention) {
    f.texte(m.score.mention, {
      x: MARGE,
      y: f.y + 55,
      taille: 10,
      couleur: 'texte-2',
      largeur: LARGEUR_UTILE,
      alignement: 'centre',
    })
  }
  f.y += HAUTEUR_SCORE + ESPACE
}

function dessinerPeriodes(f: Feuille, m: ModeleFeuille, hauteurLigne: number) {
  // Assez étroit pour que « 2ème mi-temps » tienne encore en en-tête avec deux prolongations (5 colonnes).
  const largeurEquipe = 100
  const largeurLibelle = 72
  const largeurColonne = (LARGEUR_UTILE - largeurEquipe - largeurLibelle) / m.periodes.colonnes.length
  const colonnes: Colonne[] = [
    { titre: 'Équipe', largeur: largeurEquipe },
    { titre: '', largeur: largeurLibelle },
    ...m.periodes.colonnes.map((titre) => ({ titre, largeur: largeurColonne, alignement: 'centre' as const })),
  ]
  const chiffres = (valeurs: number[]) => valeurs.map(String)
  const lignes: Cellule[][] = m.periodes.lignes.flatMap((ligne) => [
    [ligne.nom, 'Points', ...chiffres(ligne.points)],
    ['', 'Fautes éq.', ...chiffres(ligne.fautesEquipe)],
    ['', 'Temps morts', ...chiffres(ligne.tempsMorts)],
  ])
  f.tableau(colonnes, lignes, hauteurLigne, 9)
  f.y += ESPACE
}

function dessinerEquipe(f: Feuille, bloc: BlocEquipe, hauteurLigne: number) {
  f.assurerPlace(HAUTEUR_TITRE_EQUIPE + hauteurLigne * 3)
  const couleur: NomCouleur = bloc.equipe === 'A' ? 'equipe-a' : 'equipe-b'
  const moitie = LARGEUR_UTILE / 2
  f.rectangle(MARGE, f.y, 4, HAUTEUR_TITRE_EQUIPE - 4, { fond: couleur })
  f.texte(bloc.nom, { x: MARGE + 12, y: f.y + 13, taille: 13, police: f.grasse, couleur, largeur: moitie - 12 })
  f.texte(`Maillot : ${bloc.couleur.trim() || '—'}`, {
    x: MARGE + moitie,
    y: f.y + 13,
    taille: 9,
    couleur: 'texte-2',
    largeur: moitie,
    alignement: 'droite',
  })
  const fautesCoach = bloc.fautesCoach > 0 ? ` (${bloc.fautesCoach} faute${bloc.fautesCoach > 1 ? 's' : ''})` : ''
  f.texte(bloc.coach ? `Coach : ${bloc.coach}${fautesCoach}` : 'Coach : —', {
    x: MARGE + 12,
    y: f.y + 25,
    taille: 9,
    couleur: 'texte-2',
    largeur: LARGEUR_UTILE - 12,
  })
  f.y += HAUTEUR_TITRE_EQUIPE

  const fixes: Colonne[] = [
    { titre: 'N°', largeur: 36, alignement: 'droite' },
    { titre: 'Licence', largeur: 84 },
    { titre: 'LF', largeur: 36, alignement: 'droite' },
    { titre: '2 pts', largeur: 40, alignement: 'droite' },
    { titre: '3 pts', largeur: 40, alignement: 'droite' },
    { titre: 'Points', largeur: 44, alignement: 'droite' },
    { titre: 'Fautes', largeur: CASES_FAUTES * PAS_CASE + 8 },
  ]
  const largeurNom = LARGEUR_UTILE - fixes.reduce((somme, c) => somme + c.largeur, 0)
  const [numero, ...reste] = fixes
  const colonnes: Colonne[] = [numero, { titre: 'Nom', largeur: largeurNom }, ...reste]
  const lignes: Cellule[][] = bloc.joueurs.map((j) => [
    String(j.numero),
    j.nom,
    j.licence,
    String(j.lf),
    String(j.deuxPts),
    String(j.troisPts),
    String(j.points),
    { cases: j.fautes, exclu: j.exclu },
  ])
  f.tableau(colonnes, lignes, hauteurLigne, 9)
  f.y += ESPACE
}

function dessinerOfficiels(f: Feuille, m: ModeleFeuille) {
  const rangees = Math.ceil(m.officiels.length / 2)
  f.assurerPlace(HAUTEUR_TITRE_OFFICIELS + rangees * HAUTEUR_CASE_OFFICIEL)
  f.texte('Officiels', { x: MARGE, y: f.y + 12, taille: 11, police: f.grasse })
  f.y += HAUTEUR_TITRE_OFFICIELS
  const largeur = (LARGEUR_UTILE - ESPACE) / 2
  m.officiels.forEach((officiel, i) => {
    const x = MARGE + (i % 2) * (largeur + ESPACE)
    const y = f.y + Math.floor(i / 2) * HAUTEUR_CASE_OFFICIEL
    f.texte(officiel.libelle, { x, y: y + 7, taille: 7, couleur: 'texte-2', largeur })
    f.rectangle(x, y + 9, largeur, HAUTEUR_SIGNATURE, { bordure: 'bordure' })
    if (officiel.valeur) f.texte(officiel.valeur, { x: x + 3, y: y + 24, taille: 9, largeur: largeur - 6 })
  })
  f.y += rangees * HAUTEUR_CASE_OFFICIEL
}

function dessinerPieds(f: Feuille, m: ModeleFeuille) {
  const total = f.pages.length
  f.pages.forEach((page, i) => {
    f.page = page
    f.texte(m.piedDePage, {
      x: MARGE,
      y: HAUTEUR_PAGE - MARGE,
      taille: 8,
      couleur: 'texte-2',
      largeur: LARGEUR_UTILE - 60,
    })
    f.texte(`Page ${i + 1}/${total}`, {
      x: MARGE,
      y: HAUTEUR_PAGE - MARGE,
      taille: 8,
      couleur: 'texte-2',
      largeur: LARGEUR_UTILE,
      alignement: 'droite',
    })
  })
}

export async function dessinerFeuille(modele: ModeleFeuille, polices: PolicesFeuille): Promise<Uint8Array> {
  const doc = await PDFDocument.create()
  doc.registerFontkit(fontkit)
  const normale = await doc.embedFont(polices.normale, { subset: true })
  const grasse = await doc.embedFont(polices.grasse, { subset: true })
  doc.setTitle(`${modele.titre} — ${modele.score.nomA} – ${modele.score.nomB}`)
  doc.setCreator('Table de marque')
  doc.setLanguage('fr')

  const feuille = new Feuille(doc, normale, grasse)
  const hauteurLigne = calculerHauteurLigne(modele)
  dessinerEnTete(feuille, modele)
  dessinerScore(feuille, modele)
  dessinerPeriodes(feuille, modele, hauteurLigne)
  dessinerEquipe(feuille, modele.equipes.A, hauteurLigne)
  dessinerEquipe(feuille, modele.equipes.B, hauteurLigne)
  dessinerOfficiels(feuille, modele)
  dessinerPieds(feuille, modele)
  return doc.save()
}
