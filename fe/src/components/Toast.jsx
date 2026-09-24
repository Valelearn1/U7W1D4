import { AnimatePresence, motion } from 'motion/react'
import { createContext, useCallback, useContext, useMemo, useRef, useState } from 'react'

// Rifacimento libero dello stack di notifiche: le piu' vecchie arretrano
// dietro alla nuova, rimpicciolite e sbiadite. Al passaggio del mouse lo
// stack si apre a ventaglio.
//
// Le altezze sono fisse apposta (ALTEZZA): cosi' gli scostamenti si calcolano
// senza misurare il DOM, che e' la parte fragile di questo effetto.
const ALTEZZA = 56
const DISTANZA = 10 // di quanto arretra ogni toast dietro al precedente
const VISIBILI = 3
const DURATA = 4000

const ContestoToast = createContext(null)

export function useToast() {
  const contesto = useContext(ContestoToast)
  if (!contesto) throw new Error('useToast va usato dentro <ProviderToast>')
  return contesto
}

export function ProviderToast({ children }) {
  const [toasts, setToasts] = useState([])
  const prossimoId = useRef(0)

  const chiudi = useCallback((id) => {
    setToasts((correnti) => correnti.filter((t) => t.id !== id))
  }, [])

  const mostra = useCallback(
    (testo, tipo = 'info') => {
      const id = prossimoId.current++
      setToasts((correnti) => [...correnti, { id, testo, tipo }])
      window.setTimeout(() => chiudi(id), DURATA)
      return id
    },
    [chiudi],
  )

  const toast = useMemo(
    () => ({
      mostra,
      ok: (testo) => mostra(testo, 'ok'),
      errore: (testo) => mostra(testo, 'errore'),
      info: (testo) => mostra(testo, 'info'),
      chiudi,
    }),
    [mostra, chiudi],
  )

  return (
    <ContestoToast.Provider value={toast}>
      {children}
      <Stack toasts={toasts} chiudi={chiudi} />
    </ContestoToast.Provider>
  )
}

function Stack({ toasts, chiudi }) {
  const [aperto, setAperto] = useState(false)

  // Solo gli ultimi N restano a schermo: oltre diventa illeggibile.
  const visibili = toasts.slice(-VISIBILI)

  return (
    <div
      className="pointer-events-none fixed right-4 bottom-4 z-50 w-80"
      style={{ height: ALTEZZA + (VISIBILI - 1) * (aperto ? ALTEZZA + 8 : DISTANZA) }}
      onMouseEnter={() => setAperto(true)}
      onMouseLeave={() => setAperto(false)}
      role="region"
      aria-live="polite"
      aria-label="Notifiche"
    >
      <AnimatePresence initial={false}>
        {visibili.map((t, indice) => {
          // distanza dal toast piu' recente: 0 = quello davanti
          const d = visibili.length - 1 - indice

          return (
            <motion.div
              key={t.id}
              layout
              initial={{ opacity: 0, y: 24, scale: 0.9 }}
              animate={{
                opacity: aperto ? 1 : Math.max(0, 1 - d * 0.28),
                y: aperto ? -d * (ALTEZZA + 8) : -d * DISTANZA,
                scale: aperto ? 1 : 1 - d * 0.05,
              }}
              exit={{ opacity: 0, y: 12, scale: 0.9, transition: { duration: 0.18 } }}
              transition={{ type: 'spring', bounce: 0.28, duration: 0.55 }}
              style={{ zIndex: indice, height: ALTEZZA }}
              className="pointer-events-auto absolute right-0 bottom-0 w-full origin-bottom"
            >
              <Riga toast={t} chiudi={() => chiudi(t.id)} />
            </motion.div>
          )
        })}
      </AnimatePresence>
    </div>
  )
}

const COLORI = {
  ok: 'text-emerald-600 scuro:text-emerald-400',
  errore: 'text-accento',
  info: 'text-tenue',
}

function Riga({ toast, chiudi }) {
  return (
    <div className="flex h-full items-center gap-3 rounded-xl border border-bordo bg-superficie px-4 shadow-lg shadow-black/5">
      <span className={`shrink-0 ${COLORI[toast.tipo] ?? COLORI.info}`}>
        <Icona tipo={toast.tipo} />
      </span>
      <p className="min-w-0 flex-1 truncate text-sm">{toast.testo}</p>
      <button
        type="button"
        onClick={chiudi}
        className="shrink-0 text-tenue hover:text-testo"
        aria-label="Chiudi notifica"
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" aria-hidden="true">
          <path d="M6 6l12 12M18 6L6 18" />
        </svg>
      </button>
    </div>
  )
}

function Icona({ tipo }) {
  const comune = { width: 17, height: 17, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 2.2, strokeLinecap: 'round', strokeLinejoin: 'round', 'aria-hidden': true }

  if (tipo === 'ok') {
    return (
      <svg {...comune}>
        <circle cx="12" cy="12" r="9" />
        <path d="M8 12.3l2.7 2.7L16 9.6" />
      </svg>
    )
  }
  if (tipo === 'errore') {
    return (
      <svg {...comune}>
        <circle cx="12" cy="12" r="9" />
        <path d="M12 7.5v5.2M12 16.3v.01" />
      </svg>
    )
  }
  return (
    <svg {...comune}>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 11v5.5M12 7.7v.01" />
    </svg>
  )
}
