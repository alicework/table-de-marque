import type { EquipePartagee, JoueurPartage } from '../../roster-share/format'

const nomJoueur = (joueur: JoueurPartage) => [joueur.prenom, joueur.nom].filter(Boolean).join(' ') || joueur.licence

export function ApercuEquipe({ equipe }: { equipe: EquipePartagee }) {
  let coach: string | null = null
  if (equipe.coach?.type === 'libre') coach = equipe.coach.nom
  if (equipe.coach?.type === 'joueur') coach = nomJoueur(equipe.joueurs[equipe.coach.index])
  return (
    <div className="apercu-equipe carte">
      <p>
        <strong>{equipe.nom}</strong>
        {equipe.couleur && ` — ${equipe.couleur}`}
      </p>
      <ul className="liste-joueurs" aria-label={`Joueurs de ${equipe.nom}`}>
        {equipe.joueurs.map((joueur, index) => (
          <li key={index}>
            {joueur.numero === null ? 'n° à attribuer' : `n°${joueur.numero}`} {nomJoueur(joueur)}
          </li>
        ))}
      </ul>
      {coach && <p>Coach : {coach}</p>}
    </div>
  )
}
