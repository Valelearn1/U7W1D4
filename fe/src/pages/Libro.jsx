import { motion, useReducedMotion } from 'motion/react'
import { useEffect, useRef, useState } from 'react'
import { Link, useLocation, useParams } from 'react-router'
import Copertina from '@/components/Copertina'
import { Blocco } from '@/components/Scheletro'
import { useBanco } from '@/components/Banco'
import { useToast } from '@/components/Toast'
import { api } from '@/lib/api'

// Il backend non espone GET /api/book/{id}: ci sono solo /all e /search, e
// LibroSearchParams non ha un filtro per id. Quindi due strade:
//  1. il libro arriva gia' pronto nello state del Link (dal catalogo): istantaneo
//  2. altrimenti si scorrono le pagine di /all finche' si trova
async function cercaPerId(id) {
  const PASSO = 100
  for (let pagina = 0; ; pagina++) {
    const risposta = await api.libri({ page: pagina, size: PASSO })
    const trovato = risposta.content.find((l) => l.id === id)
    if (trovato) return trovato
    if (pagina + 1 >= risposta.totalPages) return null
  }
}

export default function Libro() {
  const { id } = useParams()
  const posizione = useLocation()
  const banco = useBanco()
  const toast = useToast()
  const motoRidotto = useReducedMotion()

  const [libro, setLibro] = useState(posizione.state?.libro ?? null)
  const [caricamento, setCaricamento] = useState(!posizione.state?.libro)
  const [aperto, setAperto] = useState(false)

  const rifCopertina = useRef(null)

  useEffect(() => {
    if (libro) return

    let annullato = false
    cercaPerId(id)
      .then((trovato) => {
        if (!annullato) setLibro(trovato)
      })
      .catch((errore) => {
        if (!annullato) toast.errore(errore.message || 'Non riesco a caricare il libro')
      })
      .finally(() => {
        if (!annullato) setCaricamento(false)
      })

    return () => {
      annullato = true
    }
  }, [id, libro, toast])

  if (caricamento) return <Scheletro />

  if (!libro) {
    return (
      <div className="mx-auto max-w-2xl px-6 py-24 text-center">
        <h1 className="font-titolo text-3xl tracking-tight">Libro non trovato</h1>
        <Link
          to="/catalogo"
          className="mt-8 inline-block rounded-full bg-testo px-5 py-2 text-sm font-medium text-sfondo"
        >
          Torna al catalogo
        </Link>
      </div>
    )
  }

  const disponibile = libro.copieDisponibili > 0
  const nelBanco = banco.contiene(libro.id)
  const rigida = Boolean(libro.copertinaRigida)

  // Il campo copertinaRigida non decora: cambia come il libro si apre.
  // Rigida = cardine lento e pesante, brossura = piu' morbida e svelta.
  const aperturaTransizione = rigida
    ? { type: 'spring', bounce: 0.08, duration: 1.15 }
    : { type: 'spring', bounce: 0.3, duration: 0.75 }

  function portaAlBanco() {
    const aggiunto = banco.aggiungi(libro, rifCopertina.current)
    if (aggiunto) toast.ok(`"${libro.titolo}" e' sul banco`)
    else toast.info('Questo libro e\' gia\' sul banco')
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-12 sm:px-6">
      <Link to="/catalogo" className="text-xs text-tenue hover:text-testo">
        &larr; Catalogo
      </Link>

      <div className="mt-8 grid gap-10 md:grid-cols-[minmax(0,240px)_1fr]">
        <div>
          {/* La prospettiva sta sul contenitore: senza, rotateY schiaccia
              l'elemento invece di farlo ruotare nello spazio. */}
          <div style={{ perspective: 1400 }} ref={rifCopertina}>
            <motion.div
              className="relative"
              style={{ transformStyle: 'preserve-3d', aspectRatio: '2 / 3' }}
              animate={{ rotateY: aperto && !motoRidotto ? -168 : 0 }}
              transition={aperturaTransizione}
            >
              {/* fronte: la copertina */}
              <div className="absolute inset-0" style={{ backfaceVisibility: 'hidden' }}>
                {/* niente `inclina`: il flip e' gia' una rotazione 3D, due prospettive
                    annidate si disturbano a vicenda */}
                <Copertina libro={libro} dimensione="L" riempi />
                {/* ombra del dorso: piu' marcata sulle rigide */}
                <div
                  className="pointer-events-none absolute inset-y-0 left-0 rounded-l-lg"
                  style={{
                    width: rigida ? 14 : 8,
                    background: 'linear-gradient(90deg, rgb(0 0 0 / 0.35), transparent)',
                  }}
                  aria-hidden="true"
                />
              </div>

              {/* retro: la scheda, gia' ruotata di 180 cosi' si legge dritta */}
              <div
                className="absolute inset-0 overflow-auto rounded-lg border border-bordo bg-superficie p-4"
                style={{ backfaceVisibility: 'hidden', transform: 'rotateY(180deg)' }}
              >
                <dl className="space-y-2.5 text-xs">
                  <Voce etichetta="ISBN" valore={libro.isbn} mono />
                  <Voce etichetta="Editore" valore={libro.casaEditrice} />
                  <Voce etichetta="Edizione" valore={libro.edizione || '—'} />
                  <Voce etichetta="Anno" valore={libro.annoDiUscita} />
                  <Voce etichetta="Prezzo" valore={`${libro.prezzo} €`} />
                  <Voce etichetta="Copie" valore={`${libro.copieDisponibili} / ${libro.copieTotali}`} />
                  <Voce etichetta="Rilegatura" valore={rigida ? 'Rigida' : 'Brossura'} />
                </dl>
              </div>
            </motion.div>
          </div>

          <button
            type="button"
            onClick={() => setAperto((v) => !v)}
            className="mt-4 w-full rounded-lg border border-bordo py-2 text-xs text-tenue transition-colors hover:border-tenue hover:text-testo"
          >
            {aperto ? 'Chiudi il libro' : 'Apri il libro'}
          </button>
        </div>

        <div>
          <p className="text-xs tracking-[0.16em] text-tenue uppercase">{libro.genere}</p>
          <h1 className="mt-2 font-titolo text-3xl leading-tight tracking-tight text-balance sm:text-4xl">
            {libro.titolo}
          </h1>
          <p className="mt-2 text-base text-tenue">{libro.autore}</p>

          <div className="mt-6 flex flex-wrap gap-2 text-xs">
            <Etichetta>{libro.casaEditrice}</Etichetta>
            <Etichetta>{libro.annoDiUscita}</Etichetta>
            <Etichetta>{rigida ? 'Copertina rigida' : 'Brossura'}</Etichetta>
            <Etichetta accento={!disponibile}>
              {disponibile ? `${libro.copieDisponibili} copie disponibili` : 'Tutte in prestito'}
            </Etichetta>
          </div>

          <motion.button
            type="button"
            onClick={portaAlBanco}
            disabled={!disponibile || nelBanco}
            whileTap={disponibile && !nelBanco ? { scale: 0.97 } : undefined}
            className={`mt-8 rounded-full px-6 py-2.5 text-sm font-medium transition-colors ${
              !disponibile
                ? 'cursor-not-allowed border border-bordo text-tenue/60'
                : nelBanco
                  ? 'cursor-default border border-accento/40 text-accento'
                  : 'bg-testo text-sfondo hover:opacity-85'
            }`}
          >
            {!disponibile ? 'Non disponibile' : nelBanco ? 'Sul banco' : 'Portalo al banco'}
          </motion.button>

          <p className="mt-4 text-xs text-tenue">
            ISBN <span className="font-mono">{libro.isbn}</span>
          </p>
        </div>
      </div>
    </div>
  )
}

function Voce({ etichetta, valore, mono }) {
  return (
    <div className="flex justify-between gap-3 border-b border-bordo pb-2 last:border-0">
      <dt className="text-tenue">{etichetta}</dt>
      <dd className={`text-right ${mono ? 'font-mono text-[11px]' : ''}`}>{valore}</dd>
    </div>
  )
}

function Etichetta({ children, accento }) {
  return (
    <span
      className={`rounded-full px-2.5 py-1 ${
        accento ? 'bg-accento/12 text-accento' : 'bg-bordo/60 text-tenue'
      }`}
    >
      {children}
    </span>
  )
}

function Scheletro() {
  return (
    <div className="mx-auto max-w-4xl px-4 py-12 sm:px-6">
      <div className="grid gap-10 md:grid-cols-[minmax(0,240px)_1fr]">
        <Blocco className="aspect-2/3 w-full rounded-lg" />
        <div>
          <Blocco className="h-3 w-24" ritardo={0.08} />
          <Blocco className="mt-4 h-9 w-3/4" ritardo={0.16} />
          <Blocco className="mt-3 h-5 w-1/3" ritardo={0.24} />
          <Blocco className="mt-8 h-6 w-2/3 rounded-full" ritardo={0.32} />
        </div>
      </div>
    </div>
  )
}
