import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { enableMapSet } from 'immer'
import './index.css'
import App from './App.tsx'

// Enable Immer plugin for Map and Set support
enableMapSet()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
