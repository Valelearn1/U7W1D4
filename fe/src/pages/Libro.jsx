import { AnimatePresence, motion, useReducedMotion } from 'motion/react'
import { useEffect, useRef, useState } from 'react'
import { Link, useLocation, useParams } from 'react-router'
import Copertina from '@/components/Copertina'
import SelettoreIscritto, { ricordaIscritto } from '@/components/SelettoreIscritto'
import { Blocco } from '@/components/Scheletro'
import { useRaccolta } from '@/components/Raccolta'
import { useSessione } from '@/components/Sessione'
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

const DURATE = [
  { valore: 'BREVE', etichetta: 'Breve' },
  { valore: 'MEDIA', etichetta: 'Media' },
  { valore: 'LUNGA', etichetta: 'Lunga' },
]

export default function Libro() {
  const { id } = useParams()
  const posizione = useLocation()
  const raccolta = useRaccolta()
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
  const rigida = Boolean(libro.copertinaRigida)
  const banco = raccolta.modo === 'banco'
  const giaPresente = raccolta.contiene(libro.id)

  // Il campo copertinaRigida non decora: cambia come il libro si apre.
  // Rigida = cardine lento e pesante, brossura = piu' morbida e svelta.
  const aperturaTransizione = rigida
    ? { type: 'spring', bounce: 0.08, duration: 1.15 }
    : { type: 'spring', bounce: 0.3, duration: 0.75 }

  function raccogli() {
    const aggiunto = raccolta.aggiungi(libro, rifCopertina.current)
    if (!aggiunto) {
      toast.info(banco ? 'Già al banco' : 'È già nella tua lista')
      return
    }
    toast.ok(banco ? `"${libro.titolo}" è al banco` : `"${libro.titolo}" salvato`)
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
              <div className="absolute inset-0" style={{ backfaceVisibility: 'hidden' }}>
                {/* niente `inclina`: il flip e' gia' una rotazione 3D, due
                    prospettive annidate si disturbano a vicenda */}
                <Copertina libro={libro} dimensione="L" riempi />
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

          <div className="mt-8 flex flex-wrap gap-3">
            <motion.button
              type="button"
              onClick={raccogli}
              disabled={giaPresente || (banco && !disponibile)}
              whileTap={giaPresente ? undefined : { scale: 0.97 }}
              className={`rounded-full px-6 py-2.5 text-sm font-medium transition-colors ${
                giaPresente
                  ? 'cursor-default border border-accento/40 text-accento'
                  : banco && !disponibile
                    ? 'cursor-not-allowed border border-bordo text-tenue/60'
                    : 'bg-testo text-sfondo hover:opacity-85'
              }`}
            >
              {giaPresente
                ? banco ? 'Al banco' : 'Salvato'
                : banco ? 'Porta al banco' : 'Salva per dopo'}
            </motion.button>
          </div>

          {banco && <PrestaSubito libro={libro} disponibile={disponibile} onFatto={setLibro} />}

          {!banco && (
            <p className="mt-4 max-w-sm text-xs leading-relaxed text-tenue">
              Per prendere in prestito questo titolo passa dal banco con la tua tessera:
              lo registra il personale della biblioteca.
            </p>
          )}

          <p className="mt-6 text-xs text-tenue">
            ISBN <span className="font-mono">{libro.isbn}</span>
          </p>
        </div>
      </div>
    </div>
  )
}

// Prestito singolo, per l'operatore: un libro, un iscritto, una registrazione.
// E' la strada veloce quando l'iscritto porta un solo titolo; per una pila
// conviene il banco.
function PrestaSubito({ libro, disponibile, onFatto }) {
  const toast = useToast()
  const raccolta = useRaccolta()
  // Se si sta gia' servendo qualcuno, il prestito singolo parte da li'.
  const iscritto = raccolta.iscritto
  const setIscritto = raccolta.servi
  const [aperto, setAperto] = useState(false)
  const [durata, setDurata] = useState('MEDIA')
  const [inCorso, setInCorso] = useState(false)

  async function registra() {
    setInCorso(true)
    try {
      const prestito = await api.nuovoPrestito({
        userId: iscritto.id,
        libroId: libro.id,
        durata,
      })
      ricordaIscritto(iscritto)
      toast.ok(`Prestito registrato, riconsegna entro il ${prestito.dataRiconsegnaPrevista}`)

      // Una copia in meno: aggiorniamo subito invece di ricaricare la pagina.
      onFatto((l) => ({ ...l, copieDisponibili: l.copieDisponibili - 1 }))
      setAperto(false)
    } catch (errore) {
      toast.errore(errore.stato === 409 ? 'Non ci sono copie disponibili' : errore.message)
    } finally {
      setInCorso(false)
    }
  }

  if (!disponibile) return null

  return (
    <div className="mt-4 max-w-md">
      <button
        type="button"
        onClick={() => setAperto((v) => !v)}
        className="rounded-full border border-accento px-6 py-2.5 text-sm font-medium text-accento transition-colors hover:bg-accento hover:text-white"
      >
        {aperto ? 'Annulla' : 'Presta subito'}
      </button>

      <AnimatePresence initial={false}>
        {aperto && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25, ease: 'easeOut' }}
            className="overflow-hidden"
          >
            <div className="mt-4 rounded-xl border border-bordo bg-superficie p-4">
              <h2 className="text-xs tracking-[0.14em] text-tenue uppercase">A chi</h2>
              <div className="mt-3">
                <SelettoreIscritto scelto={iscritto} onScegli={setIscritto} />
              </div>

              <h2 className="mt-5 text-xs tracking-[0.14em] text-tenue uppercase">Durata</h2>
              <div className="mt-3 flex gap-2">
                {DURATE.map((d) => (
                  <button
                    key={d.valore}
                    type="button"
                    onClick={() => setDurata(d.valore)}
                    className={`relative rounded-full px-4 py-1.5 text-sm transition-colors ${
                      durata === d.valore ? 'text-sfondo' : 'text-tenue hover:text-testo'
                    }`}
                  >
                    {durata === d.valore && (
                      <motion.span
                        layoutId="durata-libro"
                        className="absolute inset-0 rounded-full bg-testo"
                        transition={{ type: 'spring', bounce: 0.25, duration: 0.5 }}
                      />
                    )}
                    <span className="relative">{d.etichetta}</span>
                  </button>
                ))}
              </div>

              <button
                type="button"
                onClick={registra}
                disabled={!iscritto || inCorso}
                title={!iscritto ? "Scegli prima l'iscritto" : undefined}
                className="mt-5 w-full rounded-full bg-accento py-2.5 text-sm font-medium text-white transition-opacity hover:opacity-85 disabled:opacity-40"
              >
                {inCorso ? 'Registrazione...' : 'Registra il prestito'}
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
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
