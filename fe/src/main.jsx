import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router'
import App from './App.jsx'
import { ProviderToast } from '@/components/Toast'
import { ProviderRaccolta } from '@/components/Raccolta'
import { ProviderSessione } from '@/components/Sessione'
import './index.css'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrowserRouter>
      {/* Il provider sta sopra le route: lo stack dei toast sopravvive ai
          cambi di pagina invece di essere smontato a ogni navigazione. */}
      <ProviderToast>
        {/* Ordine obbligato: la raccolta legge il ruolo dalla sessione per
            decidere se e' il banco dell'operatore o la lista del lettore. */}
        <ProviderSessione>
          <ProviderRaccolta>
            <App />
          </ProviderRaccolta>
        </ProviderSessione>
      </ProviderToast>
    </BrowserRouter>
  </StrictMode>,
)
