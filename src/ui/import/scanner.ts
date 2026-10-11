import { BrowserQRCodeReader } from '@zxing/browser'

export interface ControleScanner {
  arreter: () => void
}

/** Caméra arrière (deviceId absent → facingMode « environment »), décodage continu jusqu'à l'arrêt. */
export async function demarrerScanner(
  video: HTMLVideoElement,
  surCode: (texte: string) => void,
): Promise<ControleScanner> {
  const lecteur = new BrowserQRCodeReader()
  const controles = await lecteur.decodeFromVideoDevice(undefined, video, (resultat) => {
    if (resultat) surCode(resultat.getText())
  })
  return { arreter: () => controles.stop() }
}
