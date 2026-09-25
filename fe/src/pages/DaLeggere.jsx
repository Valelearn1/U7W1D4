import { AnimatePresence, motion } from 'motion/react'
import { Link } from 'react-router'
import Copertina from '@/components/Copertina'
import { useRaccolta } from '@/components/Raccolta'
import AvvisoAltraLista from '@/components/AvvisoAltraLista'

// La lista personale del lettore. Dichiarata per quello che e': un promemoria,
// non una prenotazione. Il prestito lo registra il personale al banco.
export default function DaLeggere() {
  const raccolta = useRaccolta()

  if (raccolta.quantita === 0) {
    return (
      <div className="mx-auto max-w-2xl px-6 py-24 text-center">
        <h1 className="font-titolo text-3xl tracking-tight sm:text-4xl">Da leggere</h1>
        <p className="mt-3 text-sm text-tenue">
          Qui tieni da parte i titoli che ti incuriosiscono, per ritrovarli quando passi
          in biblioteca.
        </p>

        <div className="mt-8 text-left">
          <AvvisoAltraLista />
        </div>
        <Link
          to="/catalogo"
          className="mt-8 inline-block rounded-full bg-testo px-5 py-2 text-sm font-medium text-sfondo transition-opacity hover:opacity-85"
        >
          Esplora il catalogo
        </Link>
      </div>
    )
  }

  const disponibili = raccolta.libri.filter((l) => l.copieDisponibili > 0).length

  return (
    <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6">
      <header className="mb-8">
        <h1 className="font-titolo text-3xl tracking-tight sm:text-4xl">Da leggere</h1>
        <p className="mt-1.5 text-sm text-tenue">
          {raccolta.quantita} {raccolta.quantita === 1 ? 'titolo' : 'titoli'}
          {disponibili > 0 && ` · ${disponibili} disponibili adesso`}
        </p>
      </header>

      <AvvisoAltraLista />

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

              <span
                className={`shrink-0 rounded-full px-2.5 py-1 text-[10px] ${
                  libro.copieDisponibili > 0
                    ? 'bg-emerald-500/12 text-emerald-700 scuro:text-emerald-400'
                    : 'bg-bordo/60 text-tenue'
                }`}
              >
                {libro.copieDisponibili > 0 ? 'Disponibile' : 'In prestito'}
              </span>

              <button
                type="button"
                onClick={() => raccolta.rimuovi(libro.id)}
                className="shrink-0 rounded-lg px-2 py-1.5 text-xs text-tenue transition-colors hover:text-accento"
                aria-label={`Togli ${libro.titolo} dalla lista`}
              >
                Togli
              </button>
            </motion.li>
          ))}
        </AnimatePresence>
      </motion.ul>

      <div className="mt-8 flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={raccolta.svuota}
          className="rounded-full border border-bordo px-5 py-2 text-sm transition-colors hover:border-tenue"
        >
          Svuota la lista
        </button>
      </div>

      <p className="mt-8 text-xs leading-relaxed text-tenue">
        La lista resta su questo dispositivo e non prenota nulla: la disponibilita' puo'
        cambiare. Per prendere in prestito, passa dal banco con la tua tessera.
      </p>
    </div>
  )
}
