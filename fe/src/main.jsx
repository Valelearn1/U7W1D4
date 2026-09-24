import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router'
import App from './App.jsx'
import { ProviderToast } from '@/components/Toast'
import { ProviderBanco } from '@/components/Banco'
import { ProviderSessione } from '@/components/Sessione'
import './index.css'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrowserRouter>
      {/* Il provider sta sopra le route: lo stack dei toast sopravvive ai
          cambi di pagina invece di essere smontato a ogni navigazione. */}
      <ProviderToast>
        {/* Ordine: i toast servono a tutti, la sessione serve al banco
            (per sapere chi registra), il banco serve alle pagine. */}
        <ProviderSessione>
          <ProviderBanco>
            <App />
          </ProviderBanco>
        </ProviderSessione>
      </ProviderToast>
    </BrowserRouter>
  </StrictMode>,
)
