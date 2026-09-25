import { AnimatePresence, arc, motion, useAnimate, useReducedMotion } from 'motion/react'
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'

// Il "banco" e' il bancone della biblioteca: ci appoggi i libri che vuoi
// portare via, poi li registri tutti insieme.
//
// Non e' un carrello per vezzo: POST /api/prestiti/NewPrestito vuole
// hasAnyRole('Admin','SuperUser') e un userId nel corpo, cioe' e' l'operatore
// che apre il prestito per conto di qualcuno. Un utente normale non puo'
// aprirselo da solo, quindi la raccolta resta locale e la registrazione
// avviene al banco.

const CHIAVE = 'incipit-banco'

// arc() va creato una volta sola: la sua continuita' vive in una closure,
// una nuova istanza a ogni render perderebbe memoria fra un volo e l'altro.
const ARCO = arc({ strength: 0.65, peak: 0.42, rotate: 0.35 })

const DURATA_VOLO = 0.78
const MISURA_ARRIVO = 22 // a quanti px si riduce la copertina sul banco

const ContestoBanco = createContext(null)

export function useBanco() {
  const contesto = useContext(ContestoBanco)
  if (!contesto) throw new Error('useBanco va usato dentro <ProviderBanco>')
  return contesto
}

function leggiSalvati() {
  try {
    const grezzo = localStorage.getItem(CHIAVE)
    const lista = grezzo ? JSON.parse(grezzo) : []
    return Array.isArray(lista) ? lista : []
  } catch {
    return []
  }
}

export function ProviderBanco({ children }) {
  const motoRidotto = useReducedMotion()

  const [libri, setLibri] = useState(leggiSalvati)
  const [voli, setVoli] = useState([])
  const [colpi, setColpi] = useState(0)

  // Il bersaglio del volo: lo registra l'icona nell'header.
  const bersaglio = useRef(null)
  const prossimoVolo = useRef(0)

  useEffect(() => {
    try {
      localStorage.setItem(CHIAVE, JSON.stringify(libri))
    } catch {
      // niente spazio o navigazione privata: il banco vale per questa sessione
    }
  }, [libri])

  const registraBersaglio = useCallback((elemento) => {
    bersaglio.current = elemento
  }, [])

  const rimuovi = useCallback((idLibro) => {
    setLibri((correnti) => correnti.filter((l) => l.id !== idLibro))
  }, [])

  const svuota = useCallback(() => setLibri([]), [])

  const aggiungi = useCallback(
    (libro, elementoOrigine) => {
      let giaPresente = false
      setLibri((correnti) => {
        if (correnti.some((l) => l.id === libro.id)) {
          giaPresente = true
          return correnti
        }
        // Teniamo solo i campi che servono a ridisegnarlo: l'oggetto finisce
        // in localStorage e non ha senso portarsi dietro tutto il DTO.
        const { id, titolo, autore, isbn, path, genere, copieDisponibili } = libro
        return [...correnti, { id, titolo, autore, isbn, path, genere, copieDisponibili }]
      })

      if (giaPresente) return false

      const arrivo = bersaglio.current
      if (motoRidotto || !elementoOrigine || !arrivo) {
        setColpi((n) => n + 1)
        return true
      }

      const partenza = elementoOrigine.getBoundingClientRect()
      const destinazione = arrivo.getBoundingClientRect()

      setVoli((correnti) => [
        ...correnti,
        {
          id: prossimoVolo.current++,
          libro,
          partenza: {
            left: partenza.left,
            top: partenza.top,
            width: partenza.width,
            height: partenza.height,
          },
          // Si muove per centri, altrimenti con scale diverse l'arrivo e' storto.
          dx: destinazione.left + destinazione.width / 2 - (partenza.left + partenza.width / 2),
          dy: destinazione.top + destinazione.height / 2 - (partenza.top + partenza.height / 2),
          scala: MISURA_ARRIVO / partenza.width,
        },
      ])

      return true
    },
    [motoRidotto],
  )

  const concludiVolo = useCallback((idVolo) => {
    setVoli((correnti) => correnti.filter((v) => v.id !== idVolo))
    setColpi((n) => n + 1)
  }, [])

  const valore = useMemo(
    () => ({
      libri,
      quantita: libri.length,
      contiene: (idLibro) => libri.some((l) => l.id === idLibro),
      aggiungi,
      rimuovi,
      svuota,
      registraBersaglio,
      colpi,
    }),
    [libri, aggiungi, rimuovi, svuota, registraBersaglio, colpi],
  )

  return (
    <ContestoBanco.Provider value={valore}>
      {children}

      {/* I libri in volo stanno sopra a tutto, header compreso. */}
      <div className="pointer-events-none fixed inset-0 z-[60]" aria-hidden="true">
        {voli.map((volo) => (
          <LibroInVolo key={volo.id} volo={volo} onFine={() => concludiVolo(volo.id)} />
        ))}
      </div>
    </ContestoBanco.Provider>
  )
}

function LibroInVolo({ volo, onFine }) {
  const { partenza, dx, dy, scala, libro } = volo

  return (
    <motion.div
      className="absolute overflow-hidden rounded-md shadow-xl shadow-black/25"
      style={{ ...partenza, position: 'fixed' }}
      initial={{ x: 0, y: 0, scale: 1, opacity: 1 }}
      animate={{ x: dx, y: dy, scale: scala, opacity: [1, 1, 0] }}
      transition={{
        // `path` e' quello che curva la traiettoria: senza, x e y si
        // interpolano insieme e il libro va in diagonale dritta.
        path: ARCO,
        duration: DURATA_VOLO,
        ease: [0.32, 0, 0.24, 1],
        opacity: { duration: DURATA_VOLO, times: [0, 0.82, 1], ease: 'linear' },
      }}
      onAnimationComplete={onFine}
    >
      <MiniCopertina libro={libro} />
    </motion.div>
  )
}

// Volutamente senza <img>: la copertina vola per meno di un secondo e non vale
// una richiesta a Open Library (che e' limitata a 100 ogni 5 minuti).
function MiniCopertina({ libro }) {
  let hash = 0
  const seme = libro.genere || libro.titolo || 'incipit'
  for (let i = 0; i < seme.length; i++) hash = (hash * 31 + seme.charCodeAt(i)) | 0
  const tinta = Math.abs(hash) % 360

  return (
    <div
      className="flex h-full w-full items-end p-2"
      style={{
        background: `linear-gradient(160deg, hsl(${tinta} 42% 32%), hsl(${(tinta + 24) % 360} 34% 18%))`,
      }}
    >
      <span className="font-titolo text-[11px] leading-tight font-semibold text-white/90 [overflow-wrap:anywhere]">
        {libro.titolo}
      </span>
    </div>
  )
}

// L'icona nell'header: riceve il colpo, mostra l'onda e il contatore.
export function IconaBanco() {
  const { quantita, colpi, registraBersaglio } = useBanco()
  const motoRidotto = useReducedMotion()
  const [scope, animate] = useAnimate()
  const primoRender = useRef(true)

  useEffect(() => {
    // Al montaggio colpi vale 0: senza questa guardia l'icona rimbalzerebbe
    // a ogni ricaricamento della pagina.
    if (primoRender.current) {
      primoRender.current = false
      return
    }
    if (motoRidotto || !scope.current) return

    animate([
      [scope.current, { scale: 0.78 }, { duration: 0.11, ease: 'easeOut' }],
      [scope.current, { scale: 1 }, { type: 'spring', bounce: 0.62, duration: 0.65 }],
    ])
  }, [colpi, animate, scope, motoRidotto])

  return (
    <div ref={scope} className="relative">
      <span ref={registraBersaglio} className="absolute inset-0" aria-hidden="true" />

      {/* l'onda che si allarga a ogni libro incassato */}
      <AnimatePresence>
        {colpi > 0 && (
          <motion.span
            key={colpi}
            className="pointer-events-none absolute -inset-1 rounded-full border border-accento"
            initial={{ opacity: 0.85, scale: 0.6 }}
            animate={{ opacity: 0, scale: 1.9 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.6, ease: 'easeOut' }}
            aria-hidden="true"
          />
        )}
      </AnimatePresence>

      <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M4 5.2A1.2 1.2 0 0 1 5.2 4H9a2 2 0 0 1 2 2v13a1.6 1.6 0 0 0-1.6-1.6H4Z" />
        <path d="M20 5.2A1.2 1.2 0 0 0 18.8 4H15a2 2 0 0 0-2 2v13a1.6 1.6 0 0 1 1.6-1.6H20Z" />
      </svg>

      <AnimatePresence>
        {quantita > 0 && (
          <motion.span
            className="absolute -top-2 -right-2.5 grid min-w-[17px] place-items-center rounded-full bg-accento px-1 text-[10px] font-semibold text-white tabular-nums"
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0, opacity: 0 }}
            transition={{ type: 'spring', bounce: 0.55, duration: 0.5 }}
          >
            {/* key sulla quantita': il numero scatta a ogni incremento */}
            <motion.span
              key={quantita}
              initial={{ y: -7, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ type: 'spring', bounce: 0.4, duration: 0.4 }}
            >
              {quantita}
            </motion.span>
          </motion.span>
        )}
      </AnimatePresence>
    </div>
  )
}
