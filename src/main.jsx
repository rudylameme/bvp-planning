import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import AppV5 from './AppV5.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <AppV5 />
  </StrictMode>,
)
