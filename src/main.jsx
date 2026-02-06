import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import AppV5 from './AppV5.jsx'
import AccueilEquipe from './components/equipe/AccueilEquipe'

const appMode = import.meta.env.VITE_APP_MODE

let AppComponent
if (appMode === 'equipe') {
  // Mode Équipe : accès restreint à l'univers équipe uniquement
  AppComponent = () => <AccueilEquipe onRetourAccueil={() => window.location.reload()} />
} else {
  // Mode Manager ou défaut : app complète avec les 2 univers
  AppComponent = AppV5
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <AppComponent />
  </StrictMode>,
)
