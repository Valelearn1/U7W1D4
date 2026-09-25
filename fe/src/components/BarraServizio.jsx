import { AnimatePresence, motion } from 'motion/react'
import { Link } from 'react-router'
import { useRaccolta } from '@/components/Raccolta'

// Barra sempre visibile mentre l'operatore sta servendo qualcuno: ricorda chi
// e' e quanti libri ha al banco, da qualunque pagina. Senza, l'operatore deve
// tenere a mente lo stato e tornare al banco per verificarlo.
export default function BarraServizio() {
  const { iscritto, quantita, servi, modo } = useRaccolta()

  return (
    <AnimatePresence>
      {modo === 'banco' && iscritto && (
        <motion.div
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: 'auto', opacity: 1 }}
          exit={{ height: 0, opacity: 0 }}
          transition={{ duration: 0.25, ease: 'easeOut' }}
          className="overflow-hidden border-b border-accento/30 bg-accento/8"
        >
          <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-3 px-4 py-2 sm:px-6">
            <span className="grid size-7 shrink-0 place-items-center rounded-full bg-accento text-[10px] font-semibold text-white">
              {(iscritto.nome?.[0] ?? '?') + (iscritto.cognome?.[0] ?? '')}
            </span>

            <p className="min-w-0 flex-1 truncate text-sm">
              Stai servendo <strong className="font-medium">{iscritto.nome} {iscritto.cognome}</strong>
              {quantita > 0 && (
                <span className="text-tenue">
                  {' '}· {quantita} {quantita === 1 ? 'libro' : 'libri'} al banco
                </span>
              )}
            </p>

            <Link
              to="/banco"
              className="shrink-0 rounded-full bg-accento px-3.5 py-1 text-xs font-medium text-white transition-opacity hover:opacity-85"
            >
              Vai al banco
            </Link>
            <button
              type="button"
              onClick={() => servi(null)}
              className="shrink-0 rounded-full px-2 py-1 text-xs text-tenue transition-colors hover:text-testo"
            >
              Termina
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
