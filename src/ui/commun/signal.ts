let contexte: AudioContext | null = null

/** Safari 17+ : session audio, non déclarée dans les types du DOM. */
type NavigateurAudio = Navigator & { audioSession?: { type: string } }

/** Relance un contexte suspendu ou interrompu (verrouillage, appel). Un refus est ignoré. */
function relancer(audio: AudioContext): void {
  if (audio.state !== 'running') audio.resume().catch(() => {})
}

/** À appeler dans le gestionnaire d'un tap : Safari iOS ne joue de son qu'après un geste de l'utilisateur. */
export function preparerSon(): void {
  try {
    // iPhone en mode silencieux : sans session « playback », Web Audio est muet.
    const session = (navigator as NavigateurAudio).audioSession
    if (session) session.type = 'playback'
  } catch {
    // Session audio indisponible.
  }
  try {
    if (!contexte || contexte.state === 'closed') contexte = new AudioContext()
    relancer(contexte)
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
    relancer(contexte)
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
