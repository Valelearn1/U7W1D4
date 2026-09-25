import { AnimatePresence, arc, motion, useAnimate, useReducedMotion } from 'motion/react'
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
import { useSessione } from '@/components/Sessione'

// Una sola meccanica di raccolta, due significati diversi a seconda di chi guarda:
//
//   operatore -> "il banco": la pila di libri che l'iscritto ha portato al
//                bancone e che sta per prendere in prestito.
//   lettore   -> "da leggere": un promemoria personale. Non prenota niente,
//                non promette niente, e vive solo in questo browser.
//
// Tenerli separati non e' un vezzo: il prestito e' un atto dell'operatore
// (NewPrestito vuole Admin o SuperUser), e mostrare a un lettore un pulsante
// che somiglia a "prendi in prestito" e' una promessa che il sistema non puo'
// mantenere.

const CHIAVI = { banco: 'incipit-banco', salvati: 'incipit-salvati' }
const CHIAVE_SERVITO = 'incipit-iscritto-servito'

// arc() va creato una volta sola: la sua continuita' vive in una closure,
// una nuova istanza a ogni render perderebbe memoria fra un volo e l'altro.
const ARCO = arc({ strength: 0.65, peak: 0.42, rotate: 0.35 })

const DURATA_VOLO = 0.78
const MISURA_ARRIVO = 22

const ContestoRaccolta = createContext(null)

export function useRaccolta() {
  const contesto = useContext(ContestoRaccolta)
  if (!contesto) throw new Error('useRaccolta va usato dentro <ProviderRaccolta>')
  return contesto
}

function leggiSalvati(chiave) {
  try {
    const grezzo = localStorage.getItem(chiave)
    const lista = grezzo ? JSON.parse(grezzo) : []
    return Array.isArray(lista) ? lista : []
  } catch {
    return []
  }
}

export function ProviderRaccolta({ children }) {
  const motoRidotto = useReducedMotion()
  const { operatore } = useSessione()

  // Il modo segue il ruolo: chi puo' aprire prestiti ha il banco, gli altri
  // hanno la lista personale. Due chiavi distinte, cosi' passando da un
  // account all'altro le due liste non si mescolano.
  const modo = operatore ? 'banco' : 'salvati'
  const chiave = CHIAVI[modo]

  // In stato tengo SOLO la lista attiva. Tenerle tutte e due era il bug:
  // venivano lette una volta sola al montaggio, e al cambio di ruolo l'effetto
  // scriveva su disco la copia vecchia e vuota, cancellando l'altra lista.
  const [libri, setLibri] = useState(() => leggiSalvati(CHIAVI[modo]))
  const [voli, setVoli] = useState([])
  const [colpi, setColpi] = useState(0)
  const [altra, setAltra] = useState(() => leggiSalvati(CHIAVI[modo === 'banco' ? 'salvati' : 'banco']).length)

  // Chi stiamo servendo al banco. Sta qui e non dentro una pagina perche' in
  // biblioteca decidi prima chi hai davanti, poi giri fra gli scaffali: la
  // scelta deve sopravvivere alla navigazione.
  const [iscritto, setIscritto] = useState(() => {
    try {
      const g = localStorage.getItem(CHIAVE_SERVITO)
      return g ? JSON.parse(g) : null
    } catch {
      return null
    }
  })

  const servi = useCallback((utente) => {
    setIscritto(utente)
    try {
      if (utente) localStorage.setItem(CHIAVE_SERVITO, JSON.stringify(utente))
      else localStorage.removeItem(CHIAVE_SERVITO)
    } catch {
      // vale per questa sessione
    }
  }, [])

  const modoCorrente = useRef(modo)
  const bersaglio = useRef(null)
  const prossimoVolo = useRef(0)

  useEffect(() => {
    if (modoCorrente.current !== modo) {
      // Il ruolo e' cambiato, quindi la lista attiva e' un'altra: va RILETTA
      // dal disco, mai sovrascritta con quella di prima.
      modoCorrente.current = modo
      setLibri(leggiSalvati(CHIAVI[modo]))
      setAltra(leggiSalvati(CHIAVI[modo === 'banco' ? 'salvati' : 'banco']).length)
      return
    }

    try {
      localStorage.setItem(chiave, JSON.stringify(libri))
    } catch {
      // niente spazio o navigazione privata: vale per questa sessione
    }
  }, [libri, modo, chiave])

  const registraBersaglio = useCallback((elemento) => {
    bersaglio.current = elemento
  }, [])

  const rimuovi = useCallback((idLibro) => {
    setLibri((correnti) => correnti.filter((x) => x.id !== idLibro))
  }, [])

  const svuota = useCallback(() => setLibri([]), [])

  // Ponte fra le due liste: chi diventa operatore ritrova quello che aveva
  // messo da parte da lettore, invece di vederlo sparire.
  const importaDaAltra = useCallback(() => {
    const altraChiave = CHIAVI[modo === 'banco' ? 'salvati' : 'banco']
    const daImportare = leggiSalvati(altraChiave)
    if (!daImportare.length) return 0

    setLibri((correnti) => {
      const presenti = new Set(correnti.map((x) => x.id))
      return [...correnti, ...daImportare.filter((x) => !presenti.has(x.id))]
    })
    try {
      localStorage.setItem(altraChiave, '[]')
    } catch {
      // se non si puo' svuotare, pazienza: i doppioni sono filtrati sopra
    }
    setAltra(0)
    return daImportare.length
  }, [modo])

  const aggiungi = useCallback(
    (libro, elementoOrigine) => {
      let giaPresente = false
      setLibri((correnti) => {
        if (correnti.some((x) => x.id === libro.id)) {
          giaPresente = true
          return correnti
        }
        // Solo i campi che servono a ridisegnarlo: finisce in localStorage e
        // non ha senso portarsi dietro tutto il DTO.
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
          // Si muove per centri: con scale molto diverse l'arrivo verrebbe storto.
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
      modo,
      operatore,
      libri,
      quantita: libri.length,
      contiene: (idLibro) => libri.some((x) => x.id === idLibro),
      aggiungi,
      rimuovi,
      svuota,
      registraBersaglio,
      colpi,
      // quanti titoli sono rimasti nell'altra lista (quella dell'altro ruolo)
      altrove: altra,
      importaDaAltra,
      // l'iscritto che l'operatore sta servendo, valido su tutte le pagine
      iscritto: operatore ? iscritto : null,
      servi,
    }),
    [modo, operatore, libri, aggiungi, rimuovi, svuota, registraBersaglio, colpi, altra, importaDaAltra, iscritto, servi],
  )

  return (
    <ContestoRaccolta.Provider value={valore}>
      {children}

      <div className="pointer-events-none fixed inset-0 z-[60]" aria-hidden="true">
        {voli.map((volo) => (
          <LibroInVolo key={volo.id} volo={volo} onFine={() => concludiVolo(volo.id)} />
        ))}
      </div>
    </ContestoRaccolta.Provider>
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

// Volutamente senza <img>: vola per meno di un secondo e non vale una
// richiesta di rete.
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

export function IconaRaccolta() {
  const { quantita, colpi, registraBersaglio, modo } = useRaccolta()
  const motoRidotto = useReducedMotion()
  const [scope, animate] = useAnimate()
  const primoRender = useRef(true)

  useEffect(() => {
    // Al montaggio colpi vale 0: senza guardia l'icona rimbalzerebbe a ogni
    // ricaricamento della pagina.
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

      {modo === 'banco' ? <IconaLibri /> : <IconaSegnalibro />}

      <AnimatePresence>
        {quantita > 0 && (
          <motion.span
            className="absolute -top-2 -right-2.5 grid min-w-[17px] place-items-center rounded-full bg-accento px-1 text-[10px] font-semibold text-white tabular-nums"
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0, opacity: 0 }}
            transition={{ type: 'spring', bounce: 0.55, duration: 0.5 }}
          >
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

function IconaLibri() {
  return (
    <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M4 5.2A1.2 1.2 0 0 1 5.2 4H9a2 2 0 0 1 2 2v13a1.6 1.6 0 0 0-1.6-1.6H4Z" />
      <path d="M20 5.2A1.2 1.2 0 0 0 18.8 4H15a2 2 0 0 0-2 2v13a1.6 1.6 0 0 1 1.6-1.6H20Z" />
    </svg>
  )
}

function IconaSegnalibro() {
  return (
    <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M6.5 4h11a1 1 0 0 1 1 1v15l-6.5-4.6L5.5 20V5a1 1 0 0 1 1-1Z" />
    </svg>
  )
}
