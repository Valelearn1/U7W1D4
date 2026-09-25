import { motion } from 'motion/react'
import { useEffect, useState } from 'react'
import { Link, Navigate } from 'react-router'
import { Blocco } from '@/components/Scheletro'
import Tessera from '@/components/Tessera'
import AvvisoScadenze from '@/components/AvvisoScadenze'
import Consigli from '@/components/Consigli'
import { useSessione } from '@/components/Sessione'
import { useToast } from '@/components/Toast'
import { api } from '@/lib/api'

const contenitore = { fermo: {}, entra: { transition: { staggerChildren: 0.07 } } }
const riga = {
  fermo: { opacity: 0, y: 14 },
  entra: { opacity: 1, y: 0, transition: { type: 'spring', bounce: 0.2, duration: 0.7 } },
}

const ETICHETTE_RUOLO = {
  SuperUser: { testo: 'SuperUser', classe: 'bg-accento text-white' },
  Admin: { testo: 'Admin', classe: 'bg-accento/15 text-accento' },
  User: { testo: 'Lettore', classe: 'bg-bordo/70 text-tenue' },
}

function dataItaliana(iso) {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('it-IT', { day: 'numeric', month: 'long', year: 'numeric' })
}

export default function Profilo() {
  const { utente, autenticato, inCaricamento } = useSessione()
  const toast = useToast()

  const [prestiti, setPrestiti] = useState(null)

  useEffect(() => {
    if (!autenticato) return
    api
      .mieiPrestiti()
      .then((p) => setPrestiti(p.content))
      .catch((errore) => toast.errore(errore.message))
  }, [autenticato, toast])

  if (inCaricamento) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6">
        <Blocco className="h-8 w-48" />
        <Blocco className="mt-6 h-40 w-full rounded-xl" ritardo={0.1} />
      </div>
    )
  }

  // Chi non ha fatto login finisce sul login, e ci torna dopo.
  if (!autenticato) return <Navigate to="/accedi" state={{ da: '/profilo' }} replace />

  const aperti = (prestiti ?? []).filter((p) => p.stato === 'APERTO').length
  const ritardo = (prestiti ?? []).filter((p) => p.stato === 'IN_RITARDO').length
  const chiusi = (prestiti ?? []).filter((p) => p.stato === 'CHIUSO').length
  const penali = (prestiti ?? []).reduce((somma, p) => somma + Number(p.penaleRiscossa ?? 0), 0)

  return (
    <motion.div
      variants={contenitore}
      initial="fermo"
      animate="entra"
      className="mx-auto max-w-3xl px-4 py-12 sm:px-6"
    >
      <motion.header variants={riga} className="flex flex-wrap items-center gap-4">
        {/* Iniziali al posto di un avatar: il backend non ha un campo immagine. */}
        <div className="grid size-16 shrink-0 place-items-center rounded-full bg-testo font-titolo text-xl text-sfondo">
          {utente.nome[0]}
          {utente.cognome[0]}
        </div>

        <div className="min-w-0">
          <h1 className="font-titolo text-3xl tracking-tight">
            {utente.nome} {utente.cognome}
          </h1>
          <p className="truncate text-sm text-tenue">{utente.email}</p>
        </div>

        <div className="ml-auto flex flex-wrap gap-1.5">
          {utente.ruoli.map((r) => {
            const e = ETICHETTE_RUOLO[r] ?? { testo: r, classe: 'bg-bordo/70 text-tenue' }
            return (
              <span key={r} className={`rounded-full px-3 py-1 text-xs font-medium ${e.classe}`}>
                {e.testo}
              </span>
            )
          })}
        </div>
      </motion.header>

      <motion.div variants={riga} className="mt-8">
        <AvvisoScadenze />
      </motion.div>

      <motion.section variants={riga} className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Numero valore={aperti} etichetta="In corso" />
        <Numero valore={ritardo} etichetta="In ritardo" accento={ritardo > 0} />
        <Numero valore={chiusi} etichetta="Restituiti" />
        <Numero valore={`${penali.toFixed(2)} €`} etichetta="Penali" accento={penali > 0} />
      </motion.section>

      <motion.section variants={riga} className="mt-10 grid gap-8 md:grid-cols-[1fr_minmax(0,280px)]">
        <div>
        <h2 className="font-titolo text-xl tracking-tight">Anagrafica</h2>
        <dl className="mt-4 divide-y divide-bordo rounded-xl border border-bordo bg-superficie px-4">
          <Voce etichetta="Nome" valore={utente.nome} />
          <Voce etichetta="Cognome" valore={utente.cognome} />
          <Voce etichetta="Email" valore={utente.email} />
          <Voce etichetta="Data di nascita" valore={dataItaliana(utente.dataDiNascita)} />
          <Voce etichetta="Indirizzo" valore={utente.indirizzo} />
          <Voce etichetta="Iscritto dal" valore={dataItaliana(utente.createdAt)} />
          <Voce etichetta="Ruoli" valore={utente.ruoli.join(', ')} />
        </dl>

        {/* Nessun form: non esiste un endpoint di aggiornamento, e uno che non
            puo' salvare e' peggio di uno che non c'e'. */}
        <p className="mt-3 text-xs text-tenue">
          Per correggere i tuoi dati rivolgiti al personale della biblioteca.
        </p>
        </div>

        <div className="md:pt-9">
          <Tessera utente={utente} />
        </div>
      </motion.section>

      <motion.div variants={riga}>
        <Consigli />
      </motion.div>

      <motion.section variants={riga} className="mt-10">
        <h2 className="font-titolo text-xl tracking-tight">Storico dei prestiti</h2>

        {prestiti === null ? (
          <div className="mt-4 flex flex-col gap-2">
            {[0, 1, 2].map((i) => (
              <Blocco key={i} className="h-14 w-full rounded-xl" ritardo={i * 0.1} />
            ))}
          </div>
        ) : prestiti.length === 0 ? (
          <p className="mt-3 text-sm text-tenue">
            Nessun prestito.{' '}
            <Link to="/catalogo" className="text-accento underline underline-offset-2">
              Scegli un libro
            </Link>
            .
          </p>
        ) : (
          <ul className="mt-4 flex flex-col gap-2">
            {prestiti.map((p) => (
              <li
                key={p.id}
                className="flex flex-wrap items-center gap-3 rounded-xl border border-bordo bg-superficie px-4 py-3"
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{p.libro.titolo}</p>
                  <p className="truncate text-xs text-tenue">
                    {dataItaliana(p.createdAt)} &rarr; {dataItaliana(p.dataRiconsegnaPrevista)}
                    {p.extended && ' · esteso'}
                  </p>
                </div>
                <span
                  className={`shrink-0 rounded-full px-2.5 py-1 text-[10px] ${
                    p.stato === 'IN_RITARDO'
                      ? 'bg-accento/12 text-accento'
                      : p.stato === 'CHIUSO'
                        ? 'bg-bordo/60 text-tenue'
                        : 'bg-emerald-500/12 text-emerald-700 scuro:text-emerald-400'
                  }`}
                >
                  {p.stato === 'IN_RITARDO' ? 'In ritardo' : p.stato === 'CHIUSO' ? 'Restituito' : 'In corso'}
                </span>
              </li>
            ))}
          </ul>
        )}
      </motion.section>
    </motion.div>
  )
}

function Numero({ valore, etichetta, accento }) {
  return (
    <div className="rounded-xl border border-bordo bg-superficie p-4">
      <p className={`font-titolo text-2xl tabular-nums ${accento ? 'text-accento' : ''}`}>{valore}</p>
      <p className="mt-0.5 text-xs text-tenue">{etichetta}</p>
    </div>
  )
}

function Voce({ etichetta, valore }) {
  return (
    <div className="flex flex-wrap justify-between gap-3 py-3 text-sm">
      <dt className="text-tenue">{etichetta}</dt>
      <dd className="text-right">{valore || '—'}</dd>
    </div>
  )
}
