let contexte: AudioContext | null = null

/** À appeler dans le gestionnaire d'un tap : Safari iOS ne joue de son qu'après un geste de l'utilisateur. */
export function preparerSon(): void {
  try {
    contexte ??= new AudioContext()
    if (contexte.state === 'suspended') void contexte.resume()
  } catch {
    // Web Audio absent ou refusé : le minuteur reste muet.
    contexte = null
  }
}

/** Bip de fin de minuteur et vibration. Silencieux si le son n'a pas été préparé. */
export function emettreSignal(): void {
  try {
    navigator.vibrate?.([200, 100, 200])
  } catch {
    // Vibration indisponible.
  }
  if (!contexte) return
  try {
    const oscillateur = contexte.createOscillator()
    const volume = contexte.createGain()
    oscillateur.frequency.value = 880
    volume.gain.value = 0.3
    oscillateur.connect(volume).connect(contexte.destination)
    oscillateur.start()
    oscillateur.stop(contexte.currentTime + 0.5)
  } catch {
    // Contexte audio fermé par le navigateur.
  }
}
