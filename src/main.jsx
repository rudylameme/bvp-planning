import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import AppV2 from './AppV2.jsx'

// Utiliser ?v2 dans l'URL pour activer la V2, sinon V1 par défaut
const useV2 = window.location.search.includes('v2');

createRoot(document.getElementById('root')).render(
  <StrictMode>
    {useV2 ? <AppV2 /> : <App />}
  </StrictMode>,
)
