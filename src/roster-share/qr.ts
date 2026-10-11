import QRCode from 'qrcode'

/** Un QR affiché sur un écran ne s'abîme pas : le niveau L garde des modules plus gros, plus faciles à scanner. */
export const NIVEAU_CORRECTION_QR = 'L'

export function qrSvg(texte: string): Promise<string> {
  return QRCode.toString(texte, { type: 'svg', errorCorrectionLevel: NIVEAU_CORRECTION_QR, margin: 4 })
}

export function versionQr(texte: string): number {
  return QRCode.create(texte, { errorCorrectionLevel: NIVEAU_CORRECTION_QR }).version
}
