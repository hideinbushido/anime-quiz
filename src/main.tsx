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
import './design/gold.css'
import './design/killerbee-or.css'
import './design/epreuves-or.css'
import './design/recap.css'
import './design/regles.css'
import './design/scores.css'
import './design/fx.css'
import { Root } from './Root.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Root />
  </StrictMode>,
)
