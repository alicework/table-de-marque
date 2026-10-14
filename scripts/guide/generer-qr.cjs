/**
 * Génère le QR code d'installation à partir de l'adresse indiquée dans le guide
 * (lien « Adresse : <a href="…"> ») et l'enregistre à l'emplacement de son <img>.
 */
const fs = require('fs')
const path = require('path')
const QRCode = require('qrcode')

const racine = path.join(__dirname, '../..')
const source = process.argv[2] ?? path.join(racine, 'docs/guide-utilisation.md')
const md = fs.readFileSync(source, 'utf8')

const adresse = /Adresse : <a href="(https?:[^"]+)"/.exec(md)?.[1]
const image = /<img src="([^"]+)"/.exec(md)?.[1]
if (!adresse || !image) throw new Error(`Adresse ou image du QR code introuvable dans ${source}`)

const sortie = path.join(path.dirname(source), image)
fs.mkdirSync(path.dirname(sortie), { recursive: true })
QRCode.toFile(sortie, adresse, {
  errorCorrectionLevel: 'M',
  margin: 2,
  width: 600,
  color: { dark: '#1d1c1aff', light: '#ffffffff' },
}).then(() => console.log('écrit', sortie, '→', adresse))
