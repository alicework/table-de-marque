export function lireOctets(fichier: Blob): Promise<Uint8Array> {
  return new Promise((resoudre, rejeter) => {
    const lecteur = new FileReader()
    lecteur.onload = () => resoudre(new Uint8Array(lecteur.result as ArrayBuffer))
    lecteur.onerror = () => rejeter(lecteur.error)
    lecteur.readAsArrayBuffer(fichier)
  })
}
