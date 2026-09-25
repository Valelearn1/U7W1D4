import { AnimatePresence, motion } from 'motion/react'
import { useEffect, useState } from 'react'
import { Link } from 'react-router'
import { useSessione } from '@/components/Sessione'
import { api } from '@/lib/api'

const GIORNI_PREAVVISO = 3

function giorniA(dataIso) {
  const oggi = new Date()
  oggi.setHours(0, 0, 0, 0)
  return Math.round((new Date(`${dataIso}T00:00:00`) - oggi) / 86400000)
}

// Banner di scadenza. Non mostra l'importo della penale maturata: il valore
// giornaliero sta fra le costanti, che solo un operatore puo' leggere.
// Meglio nessun numero che un numero inventato.
export default function AvvisoScadenze() {
  const { autenticato } = useSessione()
  const [prestiti, setPrestiti] = useState([])

  useEffect(() => {
    if (!autenticato) {
      setPrestiti([])
      return
    }
    let annullato = false
    api
      .mieiPrestiti({ size: 100 })
      .then((p) => {
        if (!annullato) setPrestiti(p.content.filter((x) => x.stato !== 'CHIUSO'))
      })
      .catch(() => {
        // silenzioso: e' un avviso, non una funzione principale
      })
    return () => {
      annullato = true
    }
  }, [autenticato])

  const ritardo = prestiti.filter((p) => p.stato === 'IN_RITARDO')
  const inScadenza = prestiti.filter(
    (p) => p.stato === 'APERTO' && giorniA(p.dataRiconsegnaPrevista) <= GIORNI_PREAVVISO,
  )

  if (!ritardo.length && !inScadenza.length) return null

  const urgente = ritardo.length > 0
  const elenco = urgente ? ritardo : inScadenza

  return (
    <AnimatePresence>
      <motion.aside
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ type: 'spring', bounce: 0.2, duration: 0.6 }}
        className={`rounded-xl border px-4 py-3 ${
          urgente ? 'border-accento/40 bg-accento/8' : 'border-bordo bg-superficie'
        }`}
      >
        <div className="flex flex-wrap items-center gap-3">
          <span className={`shrink-0 ${urgente ? 'text-accento' : 'text-tenue'}`} aria-hidden="true">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.1" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="9" />
              <path d="M12 7.4v5l3 1.8" />
            </svg>
          </span>

          <div className="min-w-0 flex-1">
            <p className={`text-sm font-medium ${urgente ? 'text-accento' : ''}`}>
              {urgente
                ? `Hai ${ritardo.length} ${ritardo.length === 1 ? 'libro in ritardo' : 'libri in ritardo'}`
                : `${inScadenza.length} ${inScadenza.length === 1 ? 'libro in scadenza' : 'libri in scadenza'}`}
            </p>
            <p className="mt-0.5 truncate text-xs text-tenue">
              {elenco
                .slice(0, 2)
                .map((p) => {
                  const g = giorniA(p.dataRiconsegnaPrevista)
                  const quando =
                    g < 0
                      ? `da ${Math.abs(g)} ${Math.abs(g) === 1 ? 'giorno' : 'giorni'}`
                      : g === 0
                        ? 'oggi'
                        : `fra ${g} ${g === 1 ? 'giorno' : 'giorni'}`
                  return `"${p.libro.titolo}" ${quando}`
                })
                .join(' · ')}
              {elenco.length > 2 && ` · e altri ${elenco.length - 2}`}
            </p>
          </div>

          <Link
            to="/prestiti"
            className="shrink-0 rounded-full border border-bordo px-3.5 py-1.5 text-xs transition-colors hover:border-tenue"
          >
            Vedi
          </Link>
        </div>

        {urgente && (
          <p className="mt-2 text-xs text-tenue">
            Riconsegna quanto prima: oltre la scadenza matura una penale.
          </p>
        )}
      </motion.aside>
    </AnimatePresence>
  )
}
