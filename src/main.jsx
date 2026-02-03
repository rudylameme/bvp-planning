import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import AppV5 from './AppV5.jsx'
import WizardManager from './components/manager/WizardManager'
import AccueilEquipe from './components/equipe/AccueilEquipe'

// V5 : Architecture Manager / Équipe
// Variable d'environnement VITE_APP_MODE pour Vercel :
// - 'manager' → manager-bvp.vercel.app
// - 'equipe' → equipe-bvp.vercel.app
// - undefined → app complète (accueil avec choix)

const appMode = import.meta.env.VITE_APP_MODE

let AppComponent
if (appMode === 'manager') {
  // Mode Manager uniquement
  AppComponent = () => <WizardManager onRetourAccueil={() => window.location.reload()} />
} else if (appMode === 'equipe') {
  // Mode Équipe uniquement
  AppComponent = () => <AccueilEquipe onRetourAccueil={() => window.location.reload()} />
} else {
  // App complète avec choix Manager/Équipe
  AppComponent = AppV5
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <AppComponent />
  </StrictMode>,
)
