import { AnimatePresence, motion } from 'motion/react'
import { useState } from 'react'
import { Link, Navigate } from 'react-router'
import Copertina from '@/components/Copertina'
import SelettoreIscritto, { ricordaIscritto } from '@/components/SelettoreIscritto'
import { useRaccolta } from '@/components/Raccolta'
import AvvisoAltraLista from '@/components/AvvisoAltraLista'
import { useSessione } from '@/components/Sessione'
import { useToast } from '@/components/Toast'
import { Blocco } from '@/components/Scheletro'
import { api } from '@/lib/api'

const DURATE = [
  { valore: 'BREVE', etichetta: 'Breve' },
  { valore: 'MEDIA', etichetta: 'Media' },
  { valore: 'LUNGA', etichetta: 'Lunga' },
]

// Il banco del bibliotecario: la pila che l'iscritto ha portato al bancone.
// Un iscritto, N libri, N registrazioni separate - NewPrestito accetta un
// libro alla volta.
export default function Banco() {
  const { operatore, inCaricamento, autenticato } = useSessione()
  const raccolta = useRaccolta()
  const toast = useToast()

  const [durata, setDurata] = useState('MEDIA')
  const [inCorso, setInCorso] = useState(false)

  // L'iscritto vive nel contesto: scelto una volta, resta mentre si naviga.
  const iscritto = raccolta.iscritto
  const setIscritto = raccolta.servi

  if (inCaricamento) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6">
        <Blocco className="h-8 w-40" />
        <Blocco className="mt-6 h-48 w-full rounded-xl" ritardo={0.1} />
      </div>
    )
  }

  if (!autenticato) return <Navigate to="/accedi" state={{ da: '/banco' }} replace />
  if (!operatore) return <Navigate to="/da-leggere" replace />

  async function registra() {
    if (!iscritto) {
      toast.errore('Scegli prima l\'iscritto')
      return
    }

    setInCorso(true)
    const riusciti = []
    const falliti = []

    // Uno alla volta e senza fermarsi al primo errore: se un titolo ha finito
    // le copie (409) gli altri devono comunque passare.
    for (const libro of raccolta.libri) {
      try {
        await api.nuovoPrestito({ userId: iscritto.id, libroId: libro.id, durata })
        riusciti.push(libro)
      } catch (errore) {
        falliti.push({ libro, messaggio: errore.message })
      }
    }

    riusciti.forEach((l) => raccolta.rimuovi(l.id))
    if (riusciti.length) {
      // Da ora comparira' fra gli iscritti recenti di questo banco.
      ricordaIscritto(iscritto)
      toast.ok(
        `${riusciti.length} ${riusciti.length === 1 ? 'prestito registrato' : 'prestiti registrati'} a ${iscritto.nome}`,
      )
    }
    falliti.forEach(({ libro, messaggio }) => toast.errore(`${libro.titolo}: ${messaggio}`))

    // A pila registrata il servizio e' finito: si riparte da capo col prossimo.
    if (riusciti.length && !falliti.length) setIscritto(null)
    setInCorso(false)
  }

  const vuoto = raccolta.quantita === 0

  return (
    <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6">
      <header className="mb-8">
        <h1 className="font-titolo text-3xl tracking-tight sm:text-4xl">Il banco</h1>
        <p className="mt-1.5 text-sm text-tenue">
          {vuoto
            ? 'Aggiungi dal catalogo i libri che l\'iscritto ha portato al bancone.'
            : `${raccolta.quantita} ${raccolta.quantita === 1 ? 'libro pronto' : 'libri pronti'} per la registrazione.`}
        </p>
      </header>

      <AvvisoAltraLista />

      <section className="rounded-xl border border-bordo bg-superficie p-4">
        <h2 className="text-xs tracking-[0.14em] text-tenue uppercase">A chi</h2>
        <div className="mt-3">
          <SelettoreIscritto scelto={iscritto} onScegli={setIscritto} />
        </div>
      </section>

      <section className="mt-6">
        <h2 className="mb-3 text-xs tracking-[0.14em] text-tenue uppercase">Libri</h2>

        {vuoto ? (
          <div className="rounded-xl border border-dashed border-bordo px-4 py-10 text-center">
            <p className="text-sm text-tenue">Nessun libro al banco.</p>
            <Link
              to="/catalogo"
              className="mt-4 inline-block rounded-full bg-testo px-5 py-2 text-sm font-medium text-sfondo transition-opacity hover:opacity-85"
            >
              Vai al catalogo
            </Link>
          </div>
        ) : (
          <motion.ul layout className="flex flex-col gap-3">
            <AnimatePresence mode="popLayout">
              {raccolta.libri.map((libro) => (
                <motion.li
                  key={libro.id}
                  layout
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, x: -24, transition: { duration: 0.2 } }}
                  transition={{ type: 'spring', bounce: 0.2, duration: 0.5 }}
                  className="flex items-center gap-4 rounded-xl border border-bordo bg-superficie p-3"
                >
                  <Copertina libro={libro} dimensione="S" className="w-12 shrink-0" />
                  <div className="min-w-0 flex-1">
                    <Link
                      to={`/libro/${libro.id}`}
                      className="block truncate font-titolo text-sm font-semibold hover:text-accento"
                    >
                      {libro.titolo}
                    </Link>
                    <p className="truncate text-xs text-tenue">{libro.autore}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => raccolta.rimuovi(libro.id)}
                    className="shrink-0 rounded-lg px-3 py-1.5 text-xs text-tenue transition-colors hover:text-accento"
                  >
                    Rimetti a posto
                  </button>
                </motion.li>
              ))}
            </AnimatePresence>
          </motion.ul>
        )}
      </section>

      {!vuoto && (
        <section className="mt-6 rounded-xl border border-bordo bg-superficie p-4">
          <h2 className="text-xs tracking-[0.14em] text-tenue uppercase">Durata</h2>

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
                    layoutId="durata-scelta"
                    className="absolute inset-0 rounded-full bg-testo"
                    transition={{ type: 'spring', bounce: 0.25, duration: 0.5 }}
                  />
                )}
                <span className="relative">{d.etichetta}</span>
              </button>
            ))}
          </div>

          <p className="mt-3 text-xs text-tenue">
            I giorni esatti dipendono dalle regole della biblioteca.
          </p>

          <div className="mt-5 flex flex-wrap gap-3">
            <button
              type="button"
              onClick={registra}
              disabled={inCorso || !iscritto}
              title={!iscritto ? 'Scegli prima l\'iscritto' : undefined}
              className="rounded-full bg-accento px-5 py-2 text-sm font-medium text-white transition-opacity hover:opacity-85 disabled:opacity-40"
            >
              {inCorso
                ? 'Registrazione...'
                : `Registra ${raccolta.quantita} ${raccolta.quantita === 1 ? 'prestito' : 'prestiti'}`}
            </button>
            <button
              type="button"
              onClick={raccolta.svuota}
              className="rounded-full border border-bordo px-5 py-2 text-sm transition-colors hover:border-tenue"
            >
              Svuota
            </button>
          </div>
        </section>
      )}
    </div>
  )
}
