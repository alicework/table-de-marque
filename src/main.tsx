import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './styles/index.css'
import App from './App'
import { lireEtEffacerCodeEquipe } from './ui/import/lienEquipe'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App codeEquipe={lireEtEffacerCodeEquipe()} />
  </StrictMode>,
)
