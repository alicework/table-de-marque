import { screen, within } from '@testing-library/react'
import type { UserEvent } from '@testing-library/user-event'

export async function remplirEquipe(
  user: UserEvent,
  legende: string,
  nom: string,
  joueurs: { numero: string; nom: string; civilite: 'M' | 'Mme' }[],
) {
  const groupe = within(screen.getByRole('group', { name: legende }))
  await user.type(groupe.getByLabelText("Nom de l'équipe"), nom)
  for (const [index, joueur] of joueurs.entries()) {
    if (index > 0) await user.click(groupe.getByRole('button', { name: 'Ajouter un joueur' }))
    await user.type(groupe.getByLabelText(`N° joueur ${index + 1}`), joueur.numero)
    await user.type(groupe.getByLabelText(`Nom joueur ${index + 1}`), joueur.nom)
    await user.selectOptions(groupe.getByLabelText(`Civilité joueur ${index + 1}`), joueur.civilite)
  }
}
