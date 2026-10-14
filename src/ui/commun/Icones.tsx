import type { ReactNode, SVGProps } from 'react'

type Props = SVGProps<SVGSVGElement>

/** Icônes décoratives : toujours accompagnées d'un texte ou d'un aria-label sur le bouton. */
function Icone({ children, ...props }: Props & { children: ReactNode }) {
  return (
    <svg
      className="icone"
      viewBox="0 0 24 24"
      width="20"
      height="20"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
      {...props}
    >
      {children}
    </svg>
  )
}

export const IconePlus = (props: Props) => (
  <Icone {...props}>
    <path d="M12 5v14M5 12h14" />
  </Icone>
)

export const IconePersonnes = (props: Props) => (
  <Icone {...props}>
    <circle cx="9" cy="8" r="3.5" />
    <path d="M2.5 20a6.5 6.5 0 0 1 13 0M16 4a3.5 3.5 0 0 1 0 7M21.5 20a6.5 6.5 0 0 0-5-6.3" />
  </Icone>
)

export const IconeQr = (props: Props) => (
  <Icone {...props}>
    <rect x="3" y="3" width="7" height="7" rx="1.5" />
    <rect x="14" y="3" width="7" height="7" rx="1.5" />
    <rect x="3" y="14" width="7" height="7" rx="1.5" />
    <path d="M14 14h3v3M21 14v3M17 21h4M14 18v3" />
  </Icone>
)

export const IconeTelecharger = (props: Props) => (
  <Icone {...props}>
    <path d="M12 4v11M7 10l5 5 5-5M4 20h16" />
  </Icone>
)

export const IconeLienExterne = (props: Props) => (
  <Icone {...props}>
    <path d="M14 4h6v6M20 4l-9 9M18 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5" />
  </Icone>
)

export const IconeFleche = (props: Props) => (
  <Icone {...props}>
    <path d="M5 12h14M13 6l6 6-6 6" />
  </Icone>
)

export const IconeRetour = (props: Props) => (
  <Icone {...props}>
    <path d="M9 14 4 9l5-5M4 9h10a6 6 0 0 1 0 12h-3" />
  </Icone>
)

export const IconeListe = (props: Props) => (
  <Icone {...props}>
    <path d="M8 6h12M8 12h12M8 18h12M4 6h.01M4 12h.01M4 18h.01" />
  </Icone>
)

export const IconeMaison = (props: Props) => (
  <Icone {...props}>
    <path d="M3 11 12 3l9 8M5 10v10h5v-6h4v6h5V10" />
  </Icone>
)

export const IconeChrono = (props: Props) => (
  <Icone {...props}>
    <circle cx="12" cy="13" r="8" />
    <path d="M12 9v4l2.5 2M9 2h6" />
  </Icone>
)

export const IconeCroix = (props: Props) => (
  <Icone {...props}>
    <path d="M6 6l12 12M18 6 6 18" />
  </Icone>
)

export const IconeAlerte = (props: Props) => (
  <Icone {...props}>
    <path d="M12 3 2 20h20L12 3zM12 9v5M12 17h.01" />
  </Icone>
)

export const IconeChevron = (props: Props) => (
  <Icone {...props}>
    <path d="m9 6 6 6-6 6" />
  </Icone>
)

export const IconeTriangleGauche = (props: Props) => (
  <Icone fill="currentColor" stroke="none" {...props}>
    <path d="M15 4 6 12l9 8z" />
  </Icone>
)

export const IconeTriangleDroite = (props: Props) => (
  <Icone fill="currentColor" stroke="none" {...props}>
    <path d="M9 4l9 8-9 8z" />
  </Icone>
)
