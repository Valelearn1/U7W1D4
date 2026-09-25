import { AnimatePresence, motion } from 'motion/react'
import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router'
import Copertina from '@/components/Copertina'
import { GrigliaScheletro } from '@/components/Scheletro'
import { useToast } from '@/components/Toast'
import { useRaccolta } from '@/components/Raccolta'
import { useSessione } from '@/components/Sessione'
import { api } from '@/lib/api'

const PER_PAGINA = 24

// /api/book/all ignora il parametro sort (ordine fisso per titolo), /search no.
// Quindi il catalogo passa sempre da /search: senza filtri restituisce tutto
// lo stesso, e in piu' si puo' ordinare.
const ORDINI = [
  { valore: 'titolo,asc', etichetta: 'Titolo A-Z' },
  { valore: 'titolo,desc', etichetta: 'Titolo Z-A' },
  { valore: 'autore,asc', etichetta: 'Autore A-Z' },
  { valore: 'annoDiUscita,desc', etichetta: 'Più recenti' },
  { valore: 'annoDiUscita,asc', etichetta: 'Più antichi' },
  { valore: 'prezzo,asc', etichetta: 'Prezzo crescente' },
  { valore: 'prezzo,desc', etichetta: 'Prezzo decrescente' },
]

const FILTRI_VUOTI = {
  annoDa: '', annoA: '', prezzoMin: '', prezzoMax: '', casaEditrice: '', copertinaRigida: '',
}

export default function Catalogo() {
  const toast = useToast()
  const { autenticato } = useSessione()

  const [pagina, setPagina] = useState(null)
  const [caricamento, setCaricamento] = useState(true)
  const [ricerca, setRicerca] = useState('')
  const [soloDisponibili, setSoloDisponibili] = useState(false)
  const [genereId, setGenereId] = useState('')
  const [ordine, setOrdine] = useState('titolo,asc')
  const [avanzati, setAvanzati] = useState(FILTRI_VUOTI)
  const [mostraAvanzati, setMostraAvanzati] = useState(false)
  const [numeroPagina, setNumeroPagina] = useState(0)
  const [generi, setGeneri] = useState([])

  // Il filtro per genere esiste solo da autenticati: l'elenco dei generi
  // richiede il login.
  useEffect(() => {
    if (!autenticato) {
      setGeneri([])
      setGenereId('')
      return
    }
    api.generi().then(setGeneri).catch(() => setGeneri([]))
  }, [autenticato])

  const chiaveFiltri = JSON.stringify({ ricerca, soloDisponibili, genereId, ordine, avanzati })

  // Cambiando un filtro si torna alla prima pagina, altrimenti si resta su una
  // pagina che nel nuovo risultato magari non esiste.
  useEffect(() => {
    setNumeroPagina(0)
  }, [chiaveFiltri])

  useEffect(() => {
    let annullato = false

    const timer = window.setTimeout(() => {
      setCaricamento(true)

      api
        .cercaLibri({
          q: ricerca.trim() || undefined,
          disponibile: soloDisponibili || undefined,
          genereId: genereId || undefined,
          annoDa: avanzati.annoDa || undefined,
          annoA: avanzati.annoA || undefined,
          prezzoMin: avanzati.prezzoMin || undefined,
          prezzoMax: avanzati.prezzoMax || undefined,
          casaEditrice: avanzati.casaEditrice.trim() || undefined,
          copertinaRigida: avanzati.copertinaRigida || undefined,
          sort: ordine,
          page: numeroPagina,
          size: PER_PAGINA,
        })
        .then((risultato) => {
          if (!annullato) setPagina(risultato)
        })
        .catch((errore) => {
          if (annullato) return
          toast.errore(errore.message || 'Non riesco a raggiungere il catalogo')
          setPagina({ content: [], totalElements: 0, totalPages: 0 })
        })
        .finally(() => {
          if (!annullato) setCaricamento(false)
        })
    }, 300)

    return () => {
      annullato = true
      window.clearTimeout(timer)
    }
  }, [chiaveFiltri, numeroPagina, ricerca, soloDisponibili, genereId, ordine, avanzati, toast])

  const libri = pagina?.content ?? []
  const totalePagine = pagina?.totalPages ?? 0
  const attivi = Object.values(avanzati).filter(Boolean).length

  function vaiA(n) {
    setNumeroPagina(n)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const aggiornaAvanzato = (campo) => (e) =>
    setAvanzati((a) => ({ ...a, [campo]: e.target.value }))

  return (
    <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
      <header className="mb-8">
        <h1 className="font-titolo text-3xl tracking-tight sm:text-4xl">Catalogo</h1>
        <p className="mt-1.5 text-sm text-tenue">
          {caricamento
            ? 'Sto cercando...'
            : `${pagina?.totalElements ?? 0} ${pagina?.totalElements === 1 ? 'titolo' : 'titoli'}`}
        </p>
      </header>

      <div className="mb-4 flex flex-wrap items-center gap-3">
        <input
          type="search"
          value={ricerca}
          onChange={(e) => setRicerca(e.target.value)}
          placeholder="Titolo, autore, casa editrice, ISBN..."
          className="min-w-0 flex-1 rounded-full border border-bordo bg-superficie px-5 py-2.5 text-sm outline-none placeholder:text-tenue focus:border-tenue"
          aria-label="Cerca nel catalogo"
        />

        <select
          value={ordine}
          onChange={(e) => setOrdine(e.target.value)}
          className="rounded-full border border-bordo bg-superficie px-4 py-2.5 text-sm outline-none focus:border-tenue"
          aria-label="Ordina i risultati"
        >
          {ORDINI.map((o) => (
            <option key={o.valore} value={o.valore}>{o.etichetta}</option>
          ))}
        </select>

        {generi.length > 0 && (
          <select
            value={genereId}
            onChange={(e) => setGenereId(e.target.value)}
            className="rounded-full border border-bordo bg-superficie px-4 py-2.5 text-sm outline-none focus:border-tenue"
            aria-label="Filtra per genere"
          >
            <option value="">Tutti i generi</option>
            {generi.map((g) => (
              <option key={g.id} value={g.id}>{g.nome}</option>
            ))}
          </select>
        )}

        <button
          type="button"
          onClick={() => setSoloDisponibili((v) => !v)}
          aria-pressed={soloDisponibili}
          className={`rounded-full border px-4 py-2.5 text-sm transition-colors ${
            soloDisponibili
              ? 'border-accento bg-accento text-white'
              : 'border-bordo text-tenue hover:border-tenue hover:text-testo'
          }`}
        >
          Solo disponibili
        </button>
      </div>

      <div className="mb-8">
        <button
          type="button"
          onClick={() => setMostraAvanzati((v) => !v)}
          className="text-xs text-tenue transition-colors hover:text-testo"
          aria-expanded={mostraAvanzati}
        >
          {mostraAvanzati ? '▾' : '▸'} Filtri avanzati
          {attivi > 0 && <span className="ml-1.5 text-accento">({attivi} attivi)</span>}
        </button>

        <AnimatePresence initial={false}>
          {mostraAvanzati && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.25, ease: 'easeOut' }}
              className="overflow-hidden"
            >
              <div className="mt-3 grid gap-4 rounded-xl border border-bordo bg-superficie p-4 sm:grid-cols-2 lg:grid-cols-4">
                <Coppia etichetta="Anno">
                  <Piccolo type="number" min="1450" max="2026" placeholder="da" value={avanzati.annoDa} onChange={aggiornaAvanzato('annoDa')} />
                  <Piccolo type="number" min="1450" max="2026" placeholder="a" value={avanzati.annoA} onChange={aggiornaAvanzato('annoA')} />
                </Coppia>

                <Coppia etichetta="Prezzo (€)">
                  <Piccolo type="number" min="0" max="99.99" step="0.5" placeholder="min" value={avanzati.prezzoMin} onChange={aggiornaAvanzato('prezzoMin')} />
                  <Piccolo type="number" min="0" max="99.99" step="0.5" placeholder="max" value={avanzati.prezzoMax} onChange={aggiornaAvanzato('prezzoMax')} />
                </Coppia>

                <Coppia etichetta="Casa editrice">
                  <Piccolo placeholder="Es. Einaudi" value={avanzati.casaEditrice} onChange={aggiornaAvanzato('casaEditrice')} />
                </Coppia>

                <Coppia etichetta="Rilegatura">
                  <select
                    value={avanzati.copertinaRigida}
                    onChange={aggiornaAvanzato('copertinaRigida')}
                    className="w-full rounded-lg border border-bordo bg-sfondo px-3 py-1.5 text-sm outline-none focus:border-tenue"
                  >
                    <option value="">Tutte</option>
                    <option value="true">Rigida</option>
                    <option value="false">Brossura</option>
                  </select>
                </Coppia>
              </div>

              {attivi > 0 && (
                <button
                  type="button"
                  onClick={() => setAvanzati(FILTRI_VUOTI)}
                  className="mt-2 text-xs text-accento underline underline-offset-2"
                >
                  Azzera i filtri avanzati
                </button>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {caricamento ? (
        <GrigliaScheletro quanti={PER_PAGINA} />
      ) : libri.length === 0 ? (
        <p className="py-20 text-center text-sm text-tenue">
          Nessun titolo corrisponde alla ricerca.
        </p>
      ) : (
        <>
          <motion.div layout className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
            <AnimatePresence mode="popLayout">
              {libri.map((libro, i) => (
                <CardLibro key={libro.id} libro={libro} indice={i} />
              ))}
            </AnimatePresence>
          </motion.div>

          {totalePagine > 1 && (
            <Paginazione corrente={numeroPagina} totale={totalePagine} vaiA={vaiA} />
          )}
        </>
      )}
    </div>
  )
}

function Coppia({ etichetta, children }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs tracking-[0.12em] text-tenue uppercase">{etichetta}</span>
      <div className="flex gap-2">{children}</div>
    </label>
  )
}

function Piccolo(props) {
  return (
    <input
      {...props}
      className="w-full min-w-0 rounded-lg border border-bordo bg-sfondo px-3 py-1.5 text-sm outline-none focus:border-tenue"
    />
  )
}

function Paginazione({ corrente, totale, vaiA }) {
  // Finestra di 5 numeri attorno a quello corrente: con 8+ pagine elencarle
  // tutte fa una fila che va a capo.
  const inizio = Math.max(0, Math.min(corrente - 2, totale - 5))
  const numeri = Array.from({ length: Math.min(5, totale) }, (_, i) => inizio + i)

  return (
    <nav className="mt-10 flex items-center justify-center gap-1.5" aria-label="Paginazione">
      <Freccia verso="indietro" disabilitata={corrente === 0} onClick={() => vaiA(corrente - 1)} />
      {inizio > 0 && (
        <>
          <Numero n={0} corrente={corrente} vaiA={vaiA} />
          <span className="px-1 text-tenue">&hellip;</span>
        </>
      )}
      {numeri.map((n) => (
        <Numero key={n} n={n} corrente={corrente} vaiA={vaiA} />
      ))}
      {inizio + 5 < totale && (
        <>
          <span className="px-1 text-tenue">&hellip;</span>
          <Numero n={totale - 1} corrente={corrente} vaiA={vaiA} />
        </>
      )}
      <Freccia verso="avanti" disabilitata={corrente >= totale - 1} onClick={() => vaiA(corrente + 1)} />
    </nav>
  )
}

function Numero({ n, corrente, vaiA }) {
  const attiva = n === corrente
  return (
    <button
      type="button"
      onClick={() => vaiA(n)}
      aria-current={attiva ? 'page' : undefined}
      className={`relative grid size-9 place-items-center rounded-full text-sm transition-colors ${
        attiva ? 'text-sfondo' : 'text-tenue hover:text-testo'
      }`}
    >
      {attiva && (
        <motion.span
          layoutId="pagina-attiva"
          className="absolute inset-0 rounded-full bg-testo"
          transition={{ type: 'spring', bounce: 0.25, duration: 0.5 }}
        />
      )}
      <span className="relative tabular-nums">{n + 1}</span>
    </button>
  )
}

function Freccia({ verso, disabilitata, onClick }) {
  const indietro = verso === 'indietro'
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabilitata}
      aria-label={indietro ? 'Pagina precedente' : 'Pagina successiva'}
      className="grid size-9 place-items-center rounded-full text-tenue transition-colors hover:text-testo disabled:opacity-30 disabled:hover:text-tenue"
    >
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d={indietro ? 'M15 6l-6 6 6 6' : 'M9 6l6 6-6 6'} />
      </svg>
    </button>
  )
}

function CardLibro({ libro, indice }) {
  const raccolta = useRaccolta()
  const toast = useToast()
  const rifCopertina = useRef(null)

  const disponibile = libro.copieDisponibili > 0
  const giaPresente = raccolta.contiene(libro.id)
  const banco = raccolta.modo === 'banco'

  // Per l'operatore il pulsante porta il libro al banco e serve una copia
  // libera. Per il lettore e' un promemoria: si puo' salvare anche un titolo
  // tutto in prestito, tanto non prenota niente.
  const bloccato = giaPresente || (banco && !disponibile)

  function raccogli(evento) {
    evento.preventDefault()
    evento.stopPropagation()

    const aggiunto = raccolta.aggiungi(libro, rifCopertina.current)
    if (!aggiunto) {
      toast.info(banco ? 'Già al banco' : 'È già nella tua lista')
      return
    }
    toast.ok(banco ? `"${libro.titolo}" è al banco` : `"${libro.titolo}" salvato`)
  }

  function etichetta() {
    if (giaPresente) return banco ? 'Al banco' : 'Salvato'
    if (banco && !disponibile) return 'Non disponibile'
    return banco ? 'Porta al banco' : 'Salva'
  }

  return (
    <motion.article
      layout
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.94 }}
      transition={{
        type: 'spring',
        bounce: 0.2,
        duration: 0.6,
        // Solo le prime card scalano l'ingresso: oltre la dodicesima il
        // ritardo si legge come lentezza, non come effetto.
        delay: Math.min(indice, 11) * 0.04,
      }}
      whileHover={{ y: -4 }}
      className="flex flex-col rounded-xl border border-bordo bg-superficie p-3"
    >
      {/* state: la scheda ha gia' il libro e non deve ricercarlo, visto che
          il backend non espone un GET /api/book/{id} */}
      <Link to={`/libro/${libro.id}`} state={{ libro }} className="block">
        <div ref={rifCopertina}>
          <Copertina libro={libro} dimensione="M" inclina />
        </div>

        <h2 className="mt-3 line-clamp-2 font-titolo text-sm leading-snug font-semibold">
          {libro.titolo}
        </h2>
        <p className="mt-1 truncate text-xs text-tenue">{libro.autore}</p>

        <div className="mt-3 flex flex-wrap items-center gap-1.5">
          <span className="rounded-full bg-bordo/60 px-2 py-0.5 text-[10px] text-tenue">
            {libro.genere}
          </span>
          <span
            className={`rounded-full px-2 py-0.5 text-[10px] ${
              disponibile ? 'bg-emerald-500/12 text-emerald-700 scuro:text-emerald-400' : 'bg-accento/12 text-accento'
            }`}
          >
            {disponibile ? `${libro.copieDisponibili} disponibili` : 'Tutte in prestito'}
          </span>
        </div>
      </Link>

      <motion.button
        type="button"
        onClick={raccogli}
        disabled={bloccato}
        whileTap={bloccato ? undefined : { scale: 0.95 }}
        // mt-auto: con i titoli su una o due righe il contenuto ha altezze diverse,
        // e senza questo i pulsanti della stessa riga non si allineano.
        className={`mt-3 mt-auto w-full rounded-lg px-3 py-2 text-xs font-medium transition-colors ${
          giaPresente
            ? 'cursor-default border border-accento/40 text-accento'
            : bloccato
              ? 'cursor-not-allowed border border-bordo text-tenue/60'
              : 'bg-testo text-sfondo hover:opacity-85'
        }`}
      >
        {etichetta()}
      </motion.button>
    </motion.article>
  )
}
