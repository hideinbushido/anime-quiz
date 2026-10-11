import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './design/tokens.css'
import './design/base.css'
import './design/intro.css'
import './design/home.css'
import './design/stage.css'
import './design/select.css'
import './design/killerbee.css'
import './design/epreuves.css'
import App from './App.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
