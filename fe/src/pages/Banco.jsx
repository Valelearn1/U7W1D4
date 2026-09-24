import { AnimatePresence, motion } from 'motion/react'
import { useState } from 'react'
import { Link } from 'react-router'
import Copertina from '@/components/Copertina'
import { useBanco } from '@/components/Banco'
import { useToast } from '@/components/Toast'
import Prestiti from '@/components/Prestiti'
import { api, leggiToken } from '@/lib/api'

const DURATE = [
  { valore: 'BREVE', etichetta: 'Breve' },
  { valore: 'MEDIA', etichetta: 'Media' },
  { valore: 'LUNGA', etichetta: 'Lunga' },
]

const RUOLI_ABILITATI = ['Admin', 'SuperUser']

export default function PaginaBanco() {
  const banco = useBanco()
  const toast = useToast()

  const [durata, setDurata] = useState('MEDIA')
  const [inCorso, setInCorso] = useState(false)

  async function registra() {
    const token = leggiToken()
    if (!token) {
      toast.errore('Serve il login di un operatore per aprire i prestiti')
      return
    }

    setInCorso(true)
    try {
      const io = await api.io()

      // Il controllo vero lo fa il backend (@PreAuthorize): questo serve solo
      // a dare un messaggio sensato invece di un 403 crudo.
      if (!io.ruoli?.some((r) => RUOLI_ABILITATI.includes(r))) {
        toast.errore('Solo Admin e SuperUser possono aprire un prestito')
        return
      }

      // Uno alla volta e senza interrompersi al primo errore: se un titolo ha
      // finito le copie (409) gli altri devono comunque passare.
      const riusciti = []
      const falliti = []

      for (const libro of banco.libri) {
        try {
          await api.nuovoPrestito({ userId: io.id, libroId: libro.id, durata })
          riusciti.push(libro)
        } catch (errore) {
          falliti.push({ libro, messaggio: errore.message })
        }
      }

      riusciti.forEach((l) => banco.rimuovi(l.id))

      if (riusciti.length) {
        toast.ok(`${riusciti.length} ${riusciti.length === 1 ? 'prestito aperto' : 'prestiti aperti'}`)
      }
      falliti.forEach(({ libro, messaggio }) => {
        toast.errore(`${libro.titolo}: ${messaggio}`)
      })
    } catch (errore) {
      toast.errore(errore.message || 'Registrazione non riuscita')
    } finally {
      setInCorso(false)
    }
  }

  if (banco.quantita === 0) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-16 sm:px-6">
        <div className="text-center">
          <h1 className="font-titolo text-3xl tracking-tight sm:text-4xl">Il banco e' vuoto</h1>
          <p className="mt-3 text-sm text-tenue">
            Scegli i titoli dal catalogo: si appoggiano qui finche' non li registri.
          </p>
          <Link
            to="/catalogo"
            className="mt-8 inline-block rounded-full bg-testo px-5 py-2 text-sm font-medium text-sfondo transition-opacity hover:opacity-85"
          >
            Vai al catalogo
          </Link>
        </div>

        {/* Il banco vuoto non deve nascondere i prestiti gia' aperti. */}
        <Prestiti />
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6">
      <header className="mb-8">
        <h1 className="font-titolo text-3xl tracking-tight sm:text-4xl">Il banco</h1>
        <p className="mt-1.5 text-sm text-tenue">
          {banco.quantita} {banco.quantita === 1 ? 'titolo pronto' : 'titoli pronti'} per la registrazione.
        </p>
      </header>

      <motion.ul layout className="flex flex-col gap-3">
        <AnimatePresence mode="popLayout">
          {banco.libri.map((libro) => (
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
                onClick={() => banco.rimuovi(libro.id)}
                className="shrink-0 rounded-lg px-3 py-1.5 text-xs text-tenue transition-colors hover:text-accento"
              >
                Rimetti a posto
              </button>
            </motion.li>
          ))}
        </AnimatePresence>
      </motion.ul>

      <div className="mt-8 rounded-xl border border-bordo bg-superficie p-4">
        <p className="text-xs tracking-[0.14em] text-tenue uppercase">Durata del prestito</p>

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
            disabled={inCorso}
            className="rounded-full bg-accento px-5 py-2 text-sm font-medium text-white transition-opacity hover:opacity-85 disabled:opacity-50"
          >
            {inCorso ? 'Registrazione...' : 'Registra i prestiti'}
          </button>
          <button
            type="button"
            onClick={banco.svuota}
            className="rounded-full border border-bordo px-5 py-2 text-sm transition-colors hover:border-tenue"
          >
            Svuota il banco
          </button>
        </div>
      </div>

      <Prestiti />

      <p className="mt-16 text-xs leading-relaxed text-tenue">
        I prestiti li registra il personale della biblioteca. Raccogli qui i titoli
        che ti interessano e presentati al banco: restano salvati anche se chiudi
        la pagina.
      </p>
    </div>
  )
}
