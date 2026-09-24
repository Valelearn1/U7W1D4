import { useCallback, useState } from 'react'

const CHIAVE = 'incipit-tema'

// Il tema e' gia' applicato sull'<html> dallo script inline in index.html:
// qui lo leggiamo, non lo ricalcoliamo, altrimenti al primo render React
// direbbe "chiaro" mentre il DOM mostra gia' lo scuro.
export function useTema() {
  const [tema, setTema] = useState(() => document.documentElement.dataset.tema || 'chiaro')

  const cambiaTema = useCallback(() => {
    setTema((corrente) => {
      const prossimo = corrente === 'scuro' ? 'chiaro' : 'scuro'
      const root = document.documentElement

      root.dataset.tema = prossimo
      // La transizione colori e' attiva solo durante il cambio (vedi index.css),
      // cosi' non rallenta gli hover normali.
      root.setAttribute('data-in-transizione', '')
      window.setTimeout(() => root.removeAttribute('data-in-transizione'), 400)

      try {
        localStorage.setItem(CHIAVE, prossimo)
      } catch {
        // navigazione privata: pazienza, il tema vale per questa sessione
      }

      return prossimo
    })
  }, [])

  return [tema, cambiaTema]
}
