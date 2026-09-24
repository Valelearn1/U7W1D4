import { AnimatePresence, motion } from 'motion/react'
import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router'
import Copertina from '@/components/Copertina'
import { GrigliaScheletro } from '@/components/Scheletro'
import { useToast } from '@/components/Toast'
import { useBanco } from '@/components/Banco'
import { useSessione } from '@/components/Sessione'
import { api } from '@/lib/api'

const PER_PAGINA = 24

export default function Catalogo() {
  const toast = useToast()
  const { autenticato } = useSessione()

  const [pagina, setPagina] = useState(null)
  const [caricamento, setCaricamento] = useState(true)
  const [ricerca, setRicerca] = useState('')
  const [soloDisponibili, setSoloDisponibili] = useState(false)
  const [genereId, setGenereId] = useState('')
  const [numeroPagina, setNumeroPagina] = useState(0)
  const [generi, setGeneri] = useState([])

  // Il filtro per genere esiste solo da autenticati: /api/generi/allGeneri e'
  // isAuthenticated() e da anonimo risponde 401.
  useEffect(() => {
    if (!autenticato) {
      setGeneri([])
      setGenereId('')
      return
    }
    api
      .generi()
      .then(setGeneri)
      .catch(() => setGeneri([]))
  }, [autenticato])

  // Cambiando un filtro si torna alla prima pagina, altrimenti si resta su una
  // pagina che nel nuovo risultato magari non esiste.
  useEffect(() => {
    setNumeroPagina(0)
  }, [ricerca, soloDisponibili, genereId])

  useEffect(() => {
    let annullato = false

    // Il ritardo evita di interrogare il backend a ogni tasto premuto.
    const timer = window.setTimeout(() => {
      setCaricamento(true)

      const conFiltri = ricerca.trim() || soloDisponibili || genereId
      const chiamata = conFiltri
        ? api.cercaLibri({
            q: ricerca.trim() || undefined,
            disponibile: soloDisponibili || undefined,
            genereId: genereId || undefined,
            page: numeroPagina,
            size: PER_PAGINA,
          })
        : api.libri({ page: numeroPagina, size: PER_PAGINA })

      chiamata
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
  }, [ricerca, soloDisponibili, genereId, numeroPagina, toast])

  const libri = pagina?.content ?? []
  const totalePagine = pagina?.totalPages ?? 0

  function vaiA(n) {
    setNumeroPagina(n)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

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

      <div className="mb-6 flex flex-wrap items-center gap-3">
        <input
          type="search"
          value={ricerca}
          onChange={(e) => setRicerca(e.target.value)}
          placeholder="Titolo, autore, casa editrice, ISBN..."
          className="min-w-0 flex-1 rounded-full border border-bordo bg-superficie px-5 py-2.5 text-sm outline-none placeholder:text-tenue focus:border-tenue"
          aria-label="Cerca nel catalogo"
        />

        {generi.length > 0 && (
          <select
            value={genereId}
            onChange={(e) => setGenereId(e.target.value)}
            className="rounded-full border border-bordo bg-superficie px-4 py-2.5 text-sm outline-none focus:border-tenue"
            aria-label="Filtra per genere"
          >
            <option value="">Tutti i generi</option>
            {generi.map((g) => (
              <option key={g.id} value={g.id}>
                {g.nome}
              </option>
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
  const banco = useBanco()
  const toast = useToast()

  // Serve per misurare da dove parte il volo: il libro decolla esattamente
  // dalla copertina, non dal centro della card.
  const rifCopertina = useRef(null)

  const disponibile = libro.copieDisponibili > 0
  const nelBanco = banco.contiene(libro.id)

  function prendi(evento) {
    evento.preventDefault()
    evento.stopPropagation()

    const aggiunto = banco.aggiungi(libro, rifCopertina.current)
    if (aggiunto) toast.ok(`"${libro.titolo}" e' sul banco`)
    else toast.info('Questo libro e\' gia\' sul banco')
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
        // ritardo diventa percepibile come lentezza, non come effetto.
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
        onClick={prendi}
        disabled={!disponibile || nelBanco}
        whileTap={disponibile && !nelBanco ? { scale: 0.95 } : undefined}
        className={`mt-3 w-full rounded-lg px-3 py-2 text-xs font-medium transition-colors ${
          !disponibile
            ? 'cursor-not-allowed border border-bordo text-tenue/60'
            : nelBanco
              ? 'cursor-default border border-accento/40 text-accento'
              : 'bg-testo text-sfondo hover:opacity-85'
        }`}
      >
        {!disponibile ? 'Non disponibile' : nelBanco ? 'Sul banco' : 'Portalo al banco'}
      </motion.button>
    </motion.article>
  )
}
