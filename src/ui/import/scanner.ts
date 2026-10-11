export interface ControleScanner {
  arreter: () => void
}

/**
 * Caméra arrière (deviceId absent → facingMode « environment »), décodage continu jusqu'à l'arrêt.
 * La bibliothèque de scan est chargée à la demande : elle pèse plus que le reste de l'application.
 */
export async function demarrerScanner(
  video: HTMLVideoElement,
  surCode: (texte: string) => void,
): Promise<ControleScanner> {
  const { BrowserQRCodeReader } = await import('@zxing/browser')
  const lecteur = new BrowserQRCodeReader()
  const controles = await lecteur.decodeFromVideoDevice(undefined, video, (resultat) => {
    if (resultat) surCode(resultat.getText())
  })
  return { arreter: () => controles.stop() }
}
