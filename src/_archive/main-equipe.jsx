import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import AccueilEquipe from './components/equipe/AccueilEquipe'

// Entry point Équipe - démarre directement sur AccueilEquipe
// URL: https://[username].github.io/equipe-planning-bvp/
createRoot(document.getElementById('root')).render(
  <StrictMode>
    <AccueilEquipe onRetourAccueil={() => window.location.reload()} />
  </StrictMode>,
)
