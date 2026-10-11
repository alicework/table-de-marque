import type { EquipeId } from '../../domain/types'

export type ActionEnAttente =
  | { equipe: EquipeId; type: 'panier'; valeur: 1 | 2 | 3 }
  | { equipe: EquipeId; type: 'faute' }
