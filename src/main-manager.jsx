import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import WizardManager from './components/manager/WizardManager'

// Entry point Manager - démarre directement sur WizardManager
// URL: https://[username].github.io/manager-planning-bvp/
createRoot(document.getElementById('root')).render(
  <StrictMode>
    <WizardManager onRetourAccueil={() => window.location.reload()} />
  </StrictMode>,
)
