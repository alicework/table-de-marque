/**
 * Génère le guide d'utilisation Word (docs/guide-utilisation.docx) à partir du Markdown,
 * aux couleurs de l'application. Usage : npm run guide [-- source.md sortie.docx]
 *
 * Polices : instances statiques de Manrope (OFL, voir polices/OFL.txt), intégrées au docx.
 * Logo : celui de l'écran d'accueil (src/ui/Accueil.tsx) rendu en PNG 512 px.
 */
const fs = require('fs')
const path = require('path')
const {
  AlignmentType, BorderStyle, Bookmark, Document, Footer, ImageRun, InternalHyperlink, LevelFormat,
  Packer, PageBreak, PageNumber, Paragraph, ShadingType, Table, TableCell, TableLayoutType, TableRow,
  TabStopType, TextRun, VerticalAlign, WidthType, HeightRule,
} = require('docx')

const racine = path.join(__dirname, '../..')
const [, , source = path.join(racine, 'docs/guide-utilisation.md'), sortie = path.join(racine, 'docs/guide-utilisation.docx')] =
  process.argv
const md = fs.readFileSync(source, 'utf8')

// Jetons de design de l'application (src/styles/jetons.css)
const C = {
  fond: 'F5F4F0', surface: 'FFFFFF', surface2: 'EDECE7', bordure: 'E3E1DB', texte: '1D1C1A', texte2: '66645E',
  accent: 'C24F12', accentTexte: 'A8420C', accentTint: 'FBEADF',
  points: '1F6B3F', pointsTint: 'E1F1E7', faute: '9A3D2E', fauteTint: 'F8E4DF',
  tempsMort: '4A4F8C', tempsMortTint: 'E7E8F6', attention: '86590E', attentionTint: 'FBEFD2', danger: 'B42318',
}
const POLICE = 'Manrope'
const POLICE_TITRE = 'Manrope ExtraBold'
const LARGEUR = 9638 // A4 moins 2 × 2 cm

// ---------- Ancres (slugs GitHub → signets Word) ----------
const slug = (t) => t.toLowerCase().replace(/[^\p{L}\p{N} -]/gu, '').replace(/ /g, '-')
const signets = new Map()
md.split('\n').filter((l) => l.startsWith('## ')).forEach((l, i) => signets.set(slug(l.slice(3).trim()), `section${i}`))

// ---------- Texte enrichi ----------
const PASTILLES = {
  '+1': [C.points, C.pointsTint], '+2': [C.points, C.pointsTint], '+3': [C.points, C.pointsTint],
  F: [C.faute, C.fauteTint], 'Temps mort': [C.tempsMort, C.tempsMortTint], '2 LF': [C.danger, 'FDE7E5'],
}

function runs(texte, base = {}) {
  const resultat = []
  const re = /\*\*(.+?)\*\*|\*(.+?)\*|`(.+?)`|\[(.+?)\]\((#.+?)\)/g
  let dernier = 0
  let m
  const brut = (t, opts = {}) => new TextRun({ text: t, ...base, ...opts })
  while ((m = re.exec(texte))) {
    if (m.index > dernier) resultat.push(brut(texte.slice(dernier, m.index)))
    if (m[1] !== undefined) {
      const pastille = PASTILLES[m[1]]
      if (pastille && !base.sansPastille) {
        resultat.push(brut(` ${m[1]} `, { bold: true, color: pastille[0], shading: { type: ShadingType.CLEAR, fill: pastille[1], color: 'auto' } }))
      } else {
        resultat.push(brut(m[1], { bold: true, color: base.couleurGras ?? C.accentTexte }))
      }
    } else if (m[2] !== undefined) {
      resultat.push(brut(m[2], { italics: true }))
    } else if (m[3] !== undefined) {
      resultat.push(brut(` ${m[3]} `, { shading: { type: ShadingType.CLEAR, fill: C.surface2, color: 'auto' } }))
    } else {
      const cible = signets.get(m[5].slice(1))
      const lien = new TextRun({ text: m[4], ...base, color: C.accentTexte, underline: {} })
      resultat.push(cible ? new InternalHyperlink({ anchor: cible, children: [lien] }) : lien)
    }
    dernier = re.lastIndex
  }
  if (dernier < texte.length) resultat.push(brut(texte.slice(dernier)))
  return resultat
}

// ---------- Blocs ----------
const sansBord = { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' }
const bordsVides = { top: sansBord, bottom: sansBord, left: sansBord, right: sansBord }
const bordFin = { style: BorderStyle.SINGLE, size: 4, color: C.bordure }

function encadre(enfants, { fond = C.accentTint, trait = C.accent } = {}) {
  return new Table({
    width: { size: LARGEUR, type: WidthType.DXA },
    columnWidths: [LARGEUR],
    layout: TableLayoutType.FIXED,
    rows: [new TableRow({ children: [new TableCell({
      width: { size: LARGEUR, type: WidthType.DXA },
      shading: { type: ShadingType.CLEAR, fill: fond, color: 'auto' },
      borders: { ...bordsVides, left: { style: BorderStyle.SINGLE, size: 24, color: trait } },
      margins: { top: 140, bottom: 140, left: 220, right: 220 },
      children: enfants,
    })] })],
  })
}

const espace = (apres = 120) => new Paragraph({ spacing: { before: 0, after: apres }, children: [] })

function largeurs(lignes) {
  const n = lignes[0].length
  const poids = Array.from({ length: n }, (_, j) =>
    Math.max(8, ...lignes.map((l) => (l[j] ?? '').replace(/\*|`/g, '').length)) ** 0.8)
  const total = poids.reduce((a, b) => a + b, 0)
  const w = poids.map((p) => Math.round((p / total) * LARGEUR))
  w[n - 1] += LARGEUR - w.reduce((a, b) => a + b, 0)
  return w
}

// Le tableau des alertes reprend les couleurs de l'écran de saisie.
const TEINTES_ALERTES = [
  { fond: C.attentionTint, texte: C.attention },
  { fond: C.fauteTint, texte: C.faute },
  { fond: C.attentionTint, texte: C.attention },
  { fond: C.attention, texte: 'FFFFFF' },
  { fond: C.danger, texte: 'FFFFFF' },
]

function tableau(lignes) {
  const w = largeurs(lignes)
  const alertes = lignes[0][0] === 'Situation'
  const cellule = (texte, j, { entete = false, teinte = null, zebre = false } = {}) => new TableCell({
    width: { size: w[j], type: WidthType.DXA },
    verticalAlign: VerticalAlign.CENTER,
    shading: { type: ShadingType.CLEAR, color: 'auto', fill: entete ? C.accentTint : teinte ? teinte.fond : zebre ? C.fond : C.surface },
    borders: { top: bordFin, bottom: bordFin, left: bordFin, right: bordFin },
    margins: { top: 90, bottom: 90, left: 140, right: 140 },
    children: [new Paragraph({
      spacing: { before: 0, after: 0, line: 276 },
      children: runs(texte, entete
        ? { bold: true, color: C.accentTexte, size: 19, sansPastille: true }
        : teinte ? { bold: true, color: teinte.texte, size: 19, couleurGras: teinte.texte, sansPastille: true }
          : { size: 19 }),
    })],
  })
  return new Table({
    width: { size: LARGEUR, type: WidthType.DXA },
    columnWidths: w,
    layout: TableLayoutType.FIXED,
    rows: lignes.map((l, i) => new TableRow({
      tableHeader: i === 0,
      cantSplit: true,
      children: l.map((t, j) => cellule(t, j, {
        entete: i === 0,
        teinte: alertes && i > 0 && j === 0 ? TEINTES_ALERTES[i - 1] : null,
        zebre: i > 0 && i % 2 === 0,
      })),
    })),
  })
}

function blocQr() {
  const L = 3400
  const pointille = { style: BorderStyle.DASHED, size: 12, color: C.accent }
  return [
    new Table({
      width: { size: L, type: WidthType.DXA },
      columnWidths: [L],
      alignment: AlignmentType.CENTER,
      layout: TableLayoutType.FIXED,
      rows: [new TableRow({
        height: { value: L, rule: HeightRule.EXACT },
        children: [new TableCell({
          width: { size: L, type: WidthType.DXA },
          verticalAlign: VerticalAlign.CENTER,
          shading: { type: ShadingType.CLEAR, fill: C.surface, color: 'auto' },
          borders: { top: pointille, bottom: pointille, left: pointille, right: pointille },
          children: [
            new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 80 }, children: [new TextRun({ text: 'QR code à venir', font: POLICE_TITRE, size: 26, color: C.accentTexte })] }),
            new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: 'Disponible dès la mise en ligne', italics: true, size: 18, color: C.texte2 })] }),
          ],
        })],
      })],
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER, spacing: { before: 160, after: 240 },
      children: [new TextRun({ text: 'Adresse : ', color: C.texte2 }), new TextRun({ text: 'adresse à venir', bold: true, italics: true, color: C.texte })],
    }),
  ]
}

// ---------- Couverture ----------
const lignes = md.split('\n')
const titre = lignes[0].replace(/^# /, '')
const intro = []
let i = 1
while (lignes[i] !== '---') { if (lignes[i].trim()) intro.push(lignes[i].trim()); i++ }

const logo = fs.readFileSync(path.join(__dirname, 'logo.png'))
const [nomApp, sousTitreDoc] = titre.split(' — ')
const couverture = [
  new Paragraph({ spacing: { before: 1800, after: 360 }, children: [new ImageRun({ type: 'png', data: logo, transformation: { width: 96, height: 96 } })] }),
  new Paragraph({ spacing: { after: 60 }, children: [new TextRun({ text: nomApp, font: POLICE_TITRE, size: 72, color: C.texte })] }),
  new Paragraph({ spacing: { after: 480 }, children: [new TextRun({ text: 'Basket loisir UFOLEP 33', size: 28, color: C.texte2, bold: true })] }),
  new Paragraph({
    spacing: { after: 360 },
    border: { left: { style: BorderStyle.SINGLE, size: 36, color: C.accent, space: 12 } },
    children: [new TextRun({ text: sousTitreDoc, font: POLICE_TITRE, size: 40, color: C.accentTexte })],
  }),
  ...intro.map((t) => new Paragraph({ spacing: { after: 160, line: 320 }, children: runs(t, { size: 23, color: C.texte }) })),
  new Paragraph({ spacing: { before: 2400 }, children: [
    new TextRun({ text: 'Saison 2025-2026', bold: true, color: C.accentTexte, size: 20 }),
    new TextRun({ text: '  ·  Téléphone et tablette  ·  Fonctionne hors connexion', color: C.texte2, size: 20 }),
  ] }),
  new Paragraph({ children: [new PageBreak()] }),
]

// ---------- Corps ----------
const corps = []
let numeroListe = 0
let dansListeNumerotee = false

while (i < lignes.length) {
  const l = lignes[i]
  const t = l.trim()

  if (t === '' || t === '---') { if (t === '') dansListeNumerotee = dansListeNumerotee && /^\s+\S|^\d+\. /.test(lignes[i + 1] ?? ''); i++; continue }

  if (t.startsWith('<!--')) { while (!lignes[i].includes('-->')) i++; i++; continue }
  if (t.startsWith('<table')) { while (!lignes[i].includes('</table>')) i++; i++; corps.push(...blocQr()); continue }
  if (t.startsWith('<p')) { i++; continue }

  if (t.startsWith('## ')) {
    const texte = t.slice(3)
    const m = /^(\d+)\. (.*)$/.exec(texte)
    const id = signets.get(slug(texte))
    const contenu = m
      ? [new TextRun({ text: `${m[1]}`, font: POLICE_TITRE, color: C.accent }), new TextRun({ text: `\t${m[2]}` })]
      : [new TextRun({ text: texte })]
    corps.push(new Paragraph({
      heading: 'Heading1',
      tabStops: [{ type: TabStopType.LEFT, position: 560 }],
      children: [new Bookmark({ id, children: contenu })],
    }))
    i++
    continue
  }
  if (t.startsWith('### ')) { corps.push(new Paragraph({ heading: 'Heading2', children: runs(t.slice(4), { sansPastille: true, couleurGras: C.accentTexte }) })); i++; continue }

  if (t.startsWith('|')) {
    const rangs = []
    while (i < lignes.length && lignes[i].trim().startsWith('|')) {
      const cellules = lignes[i].trim().replace(/^\||\|$/g, '').split('|').map((c) => c.trim())
      if (!cellules.every((c) => /^-+$/.test(c))) rangs.push(cellules)
      i++
    }
    corps.push(tableau(rangs), espace(160))
    continue
  }

  if (t.startsWith('>')) {
    const paras = []
    while (i < lignes.length && lignes[i].trim().startsWith('>')) { paras.push(lignes[i].trim().replace(/^>\s?/, '')); i++ }
    corps.push(encadre(paras.filter(Boolean).map((p) => new Paragraph({ spacing: { before: 0, after: 0, line: 300 }, children: runs(p, { size: 20, couleurGras: C.accentTexte }) }))), espace(160))
    continue
  }

  // Ligne de continuation d'une étape numérotée : même retrait, la numérotation continue.
  if (dansListeNumerotee && /^\s{2,}\S/.test(l) && !/^\s*- /.test(l)) {
    corps.push(new Paragraph({ indent: { left: 460 }, spacing: { after: 80 }, children: runs(t) }))
    i++
    continue
  }

  const num = /^(\d+)\. (.*)$/.exec(t)
  if (num) {
    if (!dansListeNumerotee) { numeroListe++; dansListeNumerotee = true }
    corps.push(new Paragraph({ numbering: { reference: 'etapes', level: 0, instance: numeroListe }, spacing: { after: 80 }, children: runs(num[2]) }))
    i++
    continue
  }
  if (/^\s*- /.test(l)) {
    const niveau = /^\s+- /.test(l) ? 1 : 0
    if (niveau === 0) dansListeNumerotee = false
    corps.push(new Paragraph({ numbering: { reference: 'puces', level: niveau }, spacing: { after: 80 }, children: runs(t.slice(2)) }))
    i++
    continue
  }

  dansListeNumerotee = false
  corps.push(new Paragraph({ spacing: { after: 140 }, children: runs(t) }))
  i++
}

// ---------- Document ----------
const police = (f) => fs.readFileSync(path.join(__dirname, 'polices', f))
const doc = new Document({
  title: titre,
  creator: 'Table de marque UFOLEP 33',
  fonts: [
    { name: POLICE, data: police('Manrope-Regular.ttf'), bold: police('Manrope-Bold.ttf') },
    { name: POLICE_TITRE, data: police('Manrope-ExtraBold.ttf') },
  ],
  styles: {
    default: {
      document: { run: { font: POLICE, size: 21, color: C.texte }, paragraph: { spacing: { line: 300 } } },
      hyperlink: { run: { color: C.accentTexte } },
    },
    paragraphStyles: [
      {
        id: 'Heading1', name: 'Heading 1', basedOn: 'Normal', next: 'Normal', quickFormat: true,
        run: { font: POLICE_TITRE, size: 36, color: C.texte },
        paragraph: {
          keepNext: true, keepLines: true, outlineLevel: 0,
          spacing: { before: 360, after: 240 },
          border: { bottom: { style: BorderStyle.SINGLE, size: 12, color: C.accent, space: 6 } },
        },
      },
      {
        id: 'Heading2', name: 'Heading 2', basedOn: 'Normal', next: 'Normal', quickFormat: true,
        run: { font: POLICE, bold: true, size: 26, color: C.accentTexte },
        paragraph: { keepNext: true, keepLines: true, outlineLevel: 1, spacing: { before: 300, after: 120 } },
      },
    ],
  },
  numbering: {
    config: [
      {
        reference: 'puces',
        levels: [
          { level: 0, format: LevelFormat.BULLET, text: '●', alignment: AlignmentType.LEFT, style: { paragraph: { indent: { left: 400, hanging: 260 } }, run: { color: C.accent, size: 14 } } },
          { level: 1, format: LevelFormat.BULLET, text: '–', alignment: AlignmentType.LEFT, style: { paragraph: { indent: { left: 860, hanging: 260 } }, run: { color: C.accent } } },
        ],
      },
      {
        reference: 'etapes',
        levels: [
          { level: 0, format: LevelFormat.DECIMAL, text: '%1.', alignment: AlignmentType.LEFT, style: { paragraph: { indent: { left: 460, hanging: 360 } }, run: { bold: true, color: C.accent } } },
          { level: 1, format: LevelFormat.BULLET, text: '–', alignment: AlignmentType.LEFT, style: { paragraph: { indent: { left: 860, hanging: 260 } }, run: { color: C.accent } } },
        ],
      },
    ],
  },
  sections: [{
    properties: {
      page: { size: { width: 11906, height: 16838 }, margin: { top: 1134, bottom: 1134, left: 1134, right: 1134, footer: 567 } },
      titlePage: true,
    },
    footers: {
      first: new Footer({ children: [] }),
      default: new Footer({
        children: [new Paragraph({
          border: { top: { style: BorderStyle.SINGLE, size: 4, color: C.bordure, space: 6 } },
          tabStops: [{ type: TabStopType.RIGHT, position: LARGEUR }],
          children: [
            new TextRun({ text: 'Table de marque', bold: true, color: C.accentTexte, size: 16 }),
            new TextRun({ text: '  ·  Guide d’utilisation  ·  Basket loisir UFOLEP 33', color: C.texte2, size: 16 }),
            new TextRun({ children: ['\t', PageNumber.CURRENT], color: C.texte2, size: 16 }),
          ],
        })],
      }),
    },
    children: [...couverture, ...corps],
  }],
})

Packer.toBuffer(doc).then((b) => { fs.writeFileSync(sortie, b); console.log('écrit', sortie, b.length) })
