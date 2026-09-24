import { AnimatePresence, motion } from 'motion/react'
import { useCallback, useEffect, useState } from 'react'
import { Blocco } from '@/components/Scheletro'
import { useSessione } from '@/components/Sessione'
import { useToast } from '@/components/Toast'
import { api } from '@/lib/api'

const STATI = {
  APERTO: { etichetta: 'In corso', classe: 'bg-emerald-500/12 text-emerald-700 scuro:text-emerald-400' },
  IN_RITARDO: { etichetta: 'In ritardo', classe: 'bg-accento/12 text-accento' },
  CHIUSO: { etichetta: 'Restituito', classe: 'bg-bordo/60 text-tenue' },
}

function giorniAllaScadenza(dataIso) {
  const oggi = new Date()
  oggi.setHours(0, 0, 0, 0)
  const scadenza = new Date(`${dataIso}T00:00:00`)
  return Math.round((scadenza - oggi) / 86400000)
}

export default function Prestiti() {
  const { autenticato, operatore } = useSessione()
  const toast = useToast()

  const [prestiti, setPrestiti] = useState(null)
  const [caricamento, setCaricamento] = useState(true)
  const [inAzione, setInAzione] = useState(null)

  const carica = useCallback(() => {
    setCaricamento(true)
    api
      .mieiPrestiti()
      .then((p) => setPrestiti(p.content))
      .catch((errore) => toast.errore(errore.message || 'Non riesco a caricare i prestiti'))
      .finally(() => setCaricamento(false))
  }, [toast])

  useEffect(() => {
    if (!autenticato) {
      setPrestiti(null)
      setCaricamento(false)
      return
    }
    carica()
  }, [autenticato, carica])

  if (!autenticato) return null

  async function azione(prestito, tipo) {
    setInAzione(prestito.id)
    try {
      if (tipo === 'chiudi') {
        await api.chiudiPrestito({ idPrestito: prestito.id })
        toast.ok(`"${prestito.libro.titolo}" restituito`)
      } else {
        await api.estendiPrestito({ idPrestito: prestito.id, giorni: 14 })
        toast.ok('Prestito esteso di 14 giorni')
      }
      carica()
    } catch (errore) {
      toast.errore(errore.message || 'Operazione non riuscita')
    } finally {
      setInAzione(null)
    }
  }

  const aperti = (prestiti ?? []).filter((p) => p.stato !== 'CHIUSO')
  const chiusi = (prestiti ?? []).filter((p) => p.stato === 'CHIUSO')

  return (
    <section className="mt-16">
      <h2 className="font-titolo text-2xl tracking-tight">I tuoi prestiti</h2>

      {caricamento ? (
        <div className="mt-5 flex flex-col gap-3">
          {[0, 1].map((i) => (
            <Blocco key={i} className="h-20 w-full rounded-xl" ritardo={i * 0.1} />
          ))}
        </div>
      ) : (prestiti ?? []).length === 0 ? (
        <p className="mt-4 text-sm text-tenue">Non hai ancora nessun prestito.</p>
      ) : (
        <>
          <ul className="mt-5 flex flex-col gap-3">
            <AnimatePresence mode="popLayout">
              {aperti.map((p) => (
                <Riga
                  key={p.id}
                  prestito={p}
                  operatore={operatore}
                  occupato={inAzione === p.id}
                  azione={azione}
                />
              ))}
            </AnimatePresence>
          </ul>

          {chiusi.length > 0 && (
            <details className="mt-6">
              <summary className="cursor-pointer text-xs text-tenue hover:text-testo">
                {chiusi.length} {chiusi.length === 1 ? 'prestito chiuso' : 'prestiti chiusi'}
              </summary>
              <ul className="mt-3 flex flex-col gap-2">
                {chiusi.map((p) => (
                  <Riga key={p.id} prestito={p} operatore={false} occupato={false} azione={azione} />
                ))}
              </ul>
            </details>
          )}
        </>
      )}
    </section>
  )
}

function Riga({ prestito, operatore, occupato, azione }) {
  const stato = STATI[prestito.stato] ?? STATI.APERTO
  const giorni = giorniAllaScadenza(prestito.dataRiconsegnaPrevista)
  const chiuso = prestito.stato === 'CHIUSO'

  // Barra del tempo residuo su una finestra convenzionale di 30 giorni: il
  // backend non espone la durata scelta, solo la data di riconsegna.
  const quota = chiuso ? 1 : Math.max(0, Math.min(1, giorni / 30))

  return (
    <motion.li
      layout
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, x: -20, transition: { duration: 0.2 } }}
      transition={{ type: 'spring', bounce: 0.2, duration: 0.5 }}
      className="rounded-xl border border-bordo bg-superficie p-4"
    >
      <div className="flex flex-wrap items-start gap-3">
        <div className="min-w-0 flex-1">
          <p className="truncate font-titolo text-sm font-semibold">{prestito.libro.titolo}</p>
          <p className="truncate text-xs text-tenue">{prestito.libro.autore}</p>
        </div>

        <span className={`shrink-0 rounded-full px-2.5 py-1 text-[10px] ${stato.classe}`}>
          {stato.etichetta}
        </span>
      </div>

      {!chiuso && (
        <>
          <div className="mt-3 h-1 overflow-hidden rounded-full bg-bordo">
            <motion.div
              className="h-full origin-left rounded-full"
              style={{ backgroundColor: giorni < 0 ? 'var(--c-accento)' : 'var(--c-testo)' }}
              initial={{ scaleX: 0 }}
              animate={{ scaleX: quota }}
              transition={{ type: 'spring', bounce: 0, duration: 0.9 }}
            />
          </div>

          <p className="mt-2 text-xs text-tenue">
            {giorni < 0
              ? `Scaduto da ${Math.abs(giorni)} ${Math.abs(giorni) === 1 ? 'giorno' : 'giorni'}`
              : giorni === 0
                ? 'Scade oggi'
                : `${giorni} ${giorni === 1 ? 'giorno' : 'giorni'} alla riconsegna`}
            {prestito.extended && ' · gia\' esteso'}
          </p>
        </>
      )}

      {chiuso && prestito.penaleRiscossa > 0 && (
        <p className="mt-2 text-xs text-accento">Penale riscossa: {prestito.penaleRiscossa} &euro;</p>
      )}

      {/* Chiudere ed estendere sono Admin/SuperUser sul backend: mostrarli a
          tutti vorrebbe dire offrire bottoni che rispondono 403. */}
      {operatore && !chiuso && (
        <div className="mt-3 flex gap-2">
          <button
            type="button"
            onClick={() => azione(prestito, 'chiudi')}
            disabled={occupato}
            className="rounded-full border border-bordo px-3.5 py-1.5 text-xs transition-colors hover:border-tenue disabled:opacity-50"
          >
            Restituisci
          </button>
          <button
            type="button"
            onClick={() => azione(prestito, 'estendi')}
            disabled={occupato || prestito.extended}
            title={prestito.extended ? 'Un prestito si puo\' estendere una volta sola' : undefined}
            className="rounded-full border border-bordo px-3.5 py-1.5 text-xs transition-colors hover:border-tenue disabled:opacity-40"
          >
            Estendi di 14 giorni
          </button>
        </div>
      )}
    </motion.li>
  )
}
