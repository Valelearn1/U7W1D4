import { AnimatePresence, motion } from 'motion/react'
import { useCallback, useEffect, useState } from 'react'
import { Navigate } from 'react-router'
import { Campo } from '@/pages/Accedi'
import { Blocco } from '@/components/Scheletro'
import { useSessione } from '@/components/Sessione'
import { useToast } from '@/components/Toast'
import { api } from '@/lib/api'

// Le sezioni seguono i @PreAuthorize del backend: mostrare una scheda che
// risponde 403 e' peggio che non mostrarla.
//   AllPrestiti, newLibro, addLibro, newGenere, costanti/all  -> Admin | SuperUser
//   editCostante, grantAdmin, revokeAdmin                     -> solo SuperUser
const SCHEDE = [
  { id: 'prestiti', titolo: 'Prestiti', soloSuper: false },
  { id: 'catalogo', titolo: 'Catalogo', soloSuper: false },
  { id: 'costanti', titolo: 'Regole', soloSuper: true },
  { id: 'ruoli', titolo: 'Ruoli', soloSuper: true },
]

export default function Amministrazione() {
  const { utente, autenticato, operatore, inCaricamento } = useSessione()
  const superUser = Boolean(utente?.ruoli?.includes('SuperUser'))
  const [scheda, setScheda] = useState('prestiti')

  if (inCaricamento) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-12 sm:px-6">
        <Blocco className="h-8 w-56" />
        <Blocco className="mt-6 h-64 w-full rounded-xl" ritardo={0.1} />
      </div>
    )
  }

  if (!autenticato) return <Navigate to="/accedi" state={{ da: '/amministrazione' }} replace />

  if (!operatore) {
    return (
      <div className="mx-auto max-w-2xl px-6 py-24 text-center">
        <h1 className="font-titolo text-3xl tracking-tight">Area riservata</h1>
        <p className="mt-3 text-sm text-tenue">
          Serve il ruolo Admin o SuperUser. Il tuo: {utente.ruoli.join(', ')}.
        </p>
      </div>
    )
  }

  const visibili = SCHEDE.filter((s) => !s.soloSuper || superUser)

  return (
    <div className="mx-auto max-w-4xl px-4 py-12 sm:px-6">
      <header className="mb-8">
        <h1 className="font-titolo text-3xl tracking-tight sm:text-4xl">Amministrazione</h1>
        <p className="mt-1.5 text-sm text-tenue">
          {superUser
            ? 'Come SuperUser vedi anche regole e ruoli.'
            : 'Come Admin: prestiti e catalogo. Regole e ruoli sono riservati al SuperUser.'}
        </p>
      </header>

      <nav className="mb-8 flex flex-wrap gap-1.5 border-b border-bordo pb-3">
        {visibili.map((s) => (
          <button
            key={s.id}
            type="button"
            onClick={() => setScheda(s.id)}
            className={`relative rounded-full px-4 py-1.5 text-sm transition-colors ${
              scheda === s.id ? 'text-sfondo' : 'text-tenue hover:text-testo'
            }`}
          >
            {scheda === s.id && (
              <motion.span
                layoutId="scheda-admin"
                className="absolute inset-0 rounded-full bg-testo"
                transition={{ type: 'spring', bounce: 0.25, duration: 0.5 }}
              />
            )}
            <span className="relative">{s.titolo}</span>
          </button>
        ))}
      </nav>

      <AnimatePresence mode="wait">
        <motion.div
          key={scheda}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -6 }}
          transition={{ duration: 0.22 }}
        >
          {scheda === 'prestiti' && <SchedaPrestiti />}
          {scheda === 'catalogo' && <SchedaCatalogo />}
          {scheda === 'costanti' && <SchedaCostanti />}
          {scheda === 'ruoli' && <SchedaRuoli />}
        </motion.div>
      </AnimatePresence>
    </div>
  )
}

/* ---------------------------- prestiti ---------------------------- */

function SchedaPrestiti() {
  const toast = useToast()
  const [prestiti, setPrestiti] = useState(null)
  const [stato, setStato] = useState('')
  const [ricerca, setRicerca] = useState('')

  const carica = useCallback(() => {
    api
      .tuttiPrestiti({ stato: stato || undefined, q: ricerca.trim() || undefined, size: 50 })
      .then((p) => setPrestiti(p.content))
      .catch((e) => toast.errore(e.message))
  }, [stato, ricerca, toast])

  useEffect(() => {
    const t = window.setTimeout(carica, 250)
    return () => window.clearTimeout(t)
  }, [carica])

  async function chiudi(prestito) {
    try {
      await api.chiudiPrestito({ idPrestito: prestito.id })
      toast.ok(`"${prestito.libro.titolo}" restituito`)
      carica()
    } catch (e) {
      toast.errore(e.message)
    }
  }

  return (
    <section>
      <div className="mb-5 flex flex-wrap gap-2">
        <input
          type="search"
          value={ricerca}
          onChange={(e) => setRicerca(e.target.value)}
          placeholder="Utente, titolo, ISBN..."
          className="min-w-0 flex-1 rounded-full border border-bordo bg-superficie px-4 py-2 text-sm outline-none focus:border-tenue"
          aria-label="Cerca fra i prestiti"
        />
        <select
          value={stato}
          onChange={(e) => setStato(e.target.value)}
          className="rounded-full border border-bordo bg-superficie px-4 py-2 text-sm outline-none focus:border-tenue"
          aria-label="Filtra per stato"
        >
          <option value="">Tutti gli stati</option>
          <option value="APERTO">Aperti</option>
          <option value="IN_RITARDO">In ritardo</option>
          <option value="CHIUSO">Chiusi</option>
        </select>
      </div>

      {prestiti === null ? (
        <div className="flex flex-col gap-2">
          {[0, 1, 2].map((i) => (
            <Blocco key={i} className="h-16 w-full rounded-xl" ritardo={i * 0.1} />
          ))}
        </div>
      ) : prestiti.length === 0 ? (
        <p className="py-12 text-center text-sm text-tenue">Nessun prestito.</p>
      ) : (
        <ul className="flex flex-col gap-2">
          {prestiti.map((p) => (
            <li key={p.id} className="flex flex-wrap items-center gap-3 rounded-xl border border-bordo bg-superficie px-4 py-3">
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{p.libro.titolo}</p>
                <p className="truncate text-xs text-tenue">
                  {p.user.nome} {p.user.cognome} · {p.user.email}
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
                {p.stato === 'IN_RITARDO' ? 'In ritardo' : p.stato === 'CHIUSO' ? 'Chiuso' : 'Aperto'}
              </span>
              {p.stato !== 'CHIUSO' && (
                <button
                  type="button"
                  onClick={() => chiudi(p)}
                  className="shrink-0 rounded-full border border-bordo px-3 py-1.5 text-xs transition-colors hover:border-tenue"
                >
                  Restituisci
                </button>
              )}
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}

/* ---------------------------- catalogo ---------------------------- */

const LIBRO_VUOTO = {
  isbn: '', titolo: '', autore: '', edizione: '', casaEditrice: '',
  prezzo: '', annoDiUscita: '', copie: '1', copertinaRigida: false, genereId: '', path: '',
}

function SchedaCatalogo() {
  const toast = useToast()
  const [generi, setGeneri] = useState([])
  const [libro, setLibro] = useState(LIBRO_VUOTO)
  const [nuovoGenere, setNuovoGenere] = useState('')
  const [erroriCampo, setErroriCampo] = useState({})
  const [inCorso, setInCorso] = useState(false)

  const caricaGeneri = useCallback(() => {
    api.generi().then(setGeneri).catch(() => setGeneri([]))
  }, [])
  useEffect(caricaGeneri, [caricaGeneri])

  const aggiorna = (campo) => (e) => {
    const valore = e.target.type === 'checkbox' ? e.target.checked : e.target.value
    setLibro((l) => ({ ...l, [campo]: valore }))
    setErroriCampo((err) => (err[campo] ? { ...err, [campo]: undefined } : err))
  }

  async function creaGenere(evento) {
    evento.preventDefault()
    try {
      await api.nuovoGenere(nuovoGenere.trim())
      toast.ok(`Genere "${nuovoGenere.trim()}" creato`)
      setNuovoGenere('')
      caricaGeneri()
    } catch (e) {
      toast.errore(e.stato === 409 ? 'Genere già presente' : e.message)
    }
  }

  async function creaLibro(evento) {
    evento.preventDefault()
    setInCorso(true)
    setErroriCampo({})
    try {
      const esito = await api.nuovoLibro({
        ...libro,
        edizione: libro.edizione || null,
        path: libro.path || null,
        prezzo: Number(libro.prezzo),
        annoDiUscita: Number(libro.annoDiUscita),
        copie: Number(libro.copie),
      })
      // Il backend risponde 201 se l'ISBN e' nuovo, 200 se esisteva e ha solo
      // sommato le copie: il messaggio lo dice.
      toast.ok(esito.messaggio ?? 'Libro inserito')
      setLibro(LIBRO_VUOTO)
    } catch (e) {
      if (e.campi) {
        setErroriCampo(e.campi)
        toast.errore('Controlla i campi segnalati')
      } else {
        toast.errore(e.message)
      }
    } finally {
      setInCorso(false)
    }
  }

  return (
    <section className="flex flex-col gap-8">
      <form onSubmit={creaGenere} className="rounded-xl border border-bordo bg-superficie p-4">
        <h2 className="font-titolo text-lg">Nuovo genere</h2>
        <div className="mt-3 flex flex-wrap gap-2">
          <input
            value={nuovoGenere}
            onChange={(e) => setNuovoGenere(e.target.value)}
            placeholder="Es. Romanzo di formazione"
            maxLength={100}
            required
            className="min-w-0 flex-1 rounded-lg border border-bordo bg-sfondo px-3.5 py-2 text-sm outline-none focus:border-tenue"
          />
          <button type="submit" className="rounded-lg bg-testo px-4 py-2 text-sm font-medium text-sfondo transition-opacity hover:opacity-85">
            Crea
          </button>
        </div>
        <p className="mt-2 text-xs text-tenue">{generi.length} generi in catalogo.</p>
      </form>

      <form onSubmit={creaLibro} className="rounded-xl border border-bordo bg-superficie p-4">
        <h2 className="font-titolo text-lg">Nuovo libro</h2>
        <p className="mt-1 text-xs text-tenue">
          Se l'ISBN esiste gia', le copie si sommano a quelle presenti.
        </p>

        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <Campo fondo="sfondo" etichetta="ISBN" value={libro.isbn} onChange={aggiorna('isbn')} inputMode="numeric" maxLength={13} errore={erroriCampo.isbn} aiuto="13 cifre" required />
          <Campo fondo="sfondo" etichetta="Titolo" value={libro.titolo} onChange={aggiorna('titolo')} errore={erroriCampo.titolo} required />
          <Campo fondo="sfondo" etichetta="Autore" value={libro.autore} onChange={aggiorna('autore')} errore={erroriCampo.autore} required />
          <Campo fondo="sfondo" etichetta="Casa editrice" value={libro.casaEditrice} onChange={aggiorna('casaEditrice')} errore={erroriCampo.casaEditrice} required />
          <Campo fondo="sfondo" etichetta="Edizione" value={libro.edizione} onChange={aggiorna('edizione')} errore={erroriCampo.edizione} />
          {/* @Digits(integer=2, fraction=2): oltre 99.99 il backend risponde 400 */}
          <Campo fondo="sfondo" etichetta="Prezzo" type="number" step="0.01" min="0" max="99.99" value={libro.prezzo} onChange={aggiorna('prezzo')} errore={erroriCampo.prezzo} aiuto="Massimo 99.99" required />
          <Campo fondo="sfondo" etichetta="Anno" type="number" min="1450" max="2026" value={libro.annoDiUscita} onChange={aggiorna('annoDiUscita')} errore={erroriCampo.annoDiUscita} required />
          <Campo fondo="sfondo" etichetta="Copie" type="number" min="1" value={libro.copie} onChange={aggiorna('copie')} errore={erroriCampo.copie} required />

          <label className="block">
            <span className="mb-1.5 block text-xs tracking-[0.12em] text-tenue uppercase">Genere</span>
            <select
              value={libro.genereId}
              onChange={aggiorna('genereId')}
              required
              className="w-full rounded-lg border border-bordo bg-sfondo px-3.5 py-2.5 text-sm outline-none focus:border-tenue"
            >
              <option value="">Scegli...</option>
              {generi.map((g) => (
                <option key={g.id} value={g.id}>{g.nome}</option>
              ))}
            </select>
          </label>

          <Campo fondo="sfondo" etichetta="URL copertina" value={libro.path} onChange={aggiorna('path')} errore={erroriCampo.path} aiuto="Vuoto: ne genera una" />
        </div>

        <label className="mt-4 flex items-center gap-2 text-sm">
          <input type="checkbox" checked={libro.copertinaRigida} onChange={aggiorna('copertinaRigida')} className="size-4 accent-[var(--c-accento)]" />
          Copertina rigida
        </label>

        <button type="submit" disabled={inCorso} className="mt-5 rounded-full bg-testo px-5 py-2 text-sm font-medium text-sfondo transition-opacity hover:opacity-85 disabled:opacity-50">
          {inCorso ? 'Inserimento...' : 'Inserisci'}
        </button>
      </form>
    </section>
  )
}

/* ---------------------------- costanti ---------------------------- */

const SPIEGAZIONI = {
  'prestito.durata.breve': 'Giorni del prestito breve',
  'prestito.durata.media': 'Giorni del prestito medio (predefinito)',
  'prestito.durata.lunga': 'Giorni del prestito lungo',
  'prestito.penale.giornaliera': 'Euro di penale per ogni giorno di ritardo',
  'prestito.penale.massima': 'Tetto massimo della penale, in euro',
}

function SchedaCostanti() {
  const toast = useToast()
  const [costanti, setCostanti] = useState(null)
  const [bozze, setBozze] = useState({})

  const carica = useCallback(() => {
    api
      .costanti()
      .then((c) => {
        setCostanti(c)
        setBozze(Object.fromEntries(c.map((x) => [x.id, x.valore])))
      })
      .catch((e) => toast.errore(e.message))
  }, [toast])
  useEffect(carica, [carica])

  async function salva(costante) {
    try {
      await api.modificaCostante(costante.id, bozze[costante.id])
      toast.ok(`"${costante.chiave}" aggiornata`)
      carica()
    } catch (e) {
      toast.errore(e.message)
    }
  }

  if (costanti === null) {
    return (
      <div className="flex flex-col gap-2">
        {[0, 1, 2].map((i) => (
          <Blocco key={i} className="h-16 w-full rounded-xl" ritardo={i * 0.1} />
        ))}
      </div>
    )
  }

  return (
    <section>
      <p className="mb-5 text-sm text-tenue">
        Durate dei prestiti e penali di ritardo. Valgono da subito, su ogni nuovo prestito.
      </p>
      <ul className="flex flex-col gap-2">
        {costanti.map((c) => (
          <li key={c.id} className="flex flex-wrap items-center gap-3 rounded-xl border border-bordo bg-superficie px-4 py-3">
            <div className="min-w-0 flex-1">
              <p className="truncate font-mono text-xs">{c.chiave}</p>
              <p className="truncate text-xs text-tenue">{SPIEGAZIONI[c.chiave] ?? 'Parametro'}</p>
            </div>
            <input
              value={bozze[c.id] ?? ''}
              onChange={(e) => setBozze((b) => ({ ...b, [c.id]: e.target.value }))}
              className="w-24 rounded-lg border border-bordo bg-sfondo px-3 py-1.5 text-sm tabular-nums outline-none focus:border-tenue"
              aria-label={`Valore di ${c.chiave}`}
            />
            <button
              type="button"
              onClick={() => salva(c)}
              disabled={bozze[c.id] === c.valore}
              className="rounded-full border border-bordo px-3.5 py-1.5 text-xs transition-colors hover:border-tenue disabled:opacity-40"
            >
              Salva
            </button>
          </li>
        ))}
      </ul>
    </section>
  )
}

/* ------------------------------ ruoli ------------------------------ */

function SchedaRuoli() {
  const toast = useToast()
  const [userId, setUserId] = useState('')
  const [inCorso, setInCorso] = useState(false)
  const [conosciuti, setConosciuti] = useState([])

  // Il backend non elenca gli iscritti, ma PrestitoResponse porta con se'
  // UtenteBreve (id, email, nome, cognome). Da li' ricaviamo almeno chi ha
  // avuto un prestito: abbastanza per lavorare senza incollare UUID a mano.
  useEffect(() => {
    api
      .tuttiPrestiti({ size: 100 })
      .then((p) => {
        const perId = new Map()
        for (const prestito of p.content) {
          if (prestito.user) perId.set(prestito.user.id, prestito.user)
        }
        setConosciuti([...perId.values()].sort((a, b) => a.email.localeCompare(b.email)))
      })
      .catch(() => setConosciuti([]))
  }, [])

  async function agisci(revoca) {
    setInCorso(true)
    try {
      if (revoca) {
        await api.revocaAdmin(userId.trim())
        toast.ok('Ruolo Admin revocato')
      } else {
        await api.promuoviAdmin(userId.trim())
        toast.ok('Promosso ad Admin')
      }
      setUserId('')
    } catch (e) {
      if (e.stato === 409) toast.errore("E' gia' Admin")
      else if (e.stato === 404) toast.errore('Utente non trovato, o non era Admin')
      else toast.errore(e.message)
    } finally {
      setInCorso(false)
    }
  }

  return (
    <section className="rounded-xl border border-bordo bg-superficie p-4">
      <h2 className="font-titolo text-lg">Promuovi ad Admin</h2>

      {/* L'elenco e' parziale per forza: non esiste un endpoint che elenchi gli
          iscritti, quindi lo ricaviamo dagli utenti presenti nei prestiti. */}
      <p className="mt-2 text-xs leading-relaxed text-tenue">
        Qui compaiono gli iscritti con almeno un prestito registrato. Per gli altri,
        incolla il loro identificativo nel campo in fondo.
      </p>

      {conosciuti.length > 0 && (
        <ul className="mt-4 flex flex-col gap-1.5">
          {conosciuti.map((u) => (
            <li key={u.id}>
              <button
                type="button"
                onClick={() => setUserId(u.id)}
                className={`flex w-full items-center gap-3 rounded-lg border px-3 py-2 text-left transition-colors ${
                  userId === u.id ? 'border-accento bg-accento/8' : 'border-bordo hover:border-tenue'
                }`}
              >
                <span className="grid size-7 shrink-0 place-items-center rounded-full bg-bordo/70 text-[10px] font-semibold text-tenue">
                  {u.nome?.[0]}
                  {u.cognome?.[0]}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm">
                    {u.nome} {u.cognome}
                  </span>
                  <span className="block truncate text-xs text-tenue">{u.email}</span>
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}

      <div className="mt-4 flex flex-wrap gap-2">
        <input
          value={userId}
          onChange={(e) => setUserId(e.target.value)}
          placeholder="oppure incolla un id"
          className="min-w-0 flex-1 rounded-lg border border-bordo bg-sfondo px-3.5 py-2 font-mono text-xs outline-none focus:border-tenue"
          aria-label="Id dell'utente"
        />
        <button
          type="button"
          onClick={() => agisci(false)}
          disabled={!userId.trim() || inCorso}
          className="rounded-lg bg-testo px-4 py-2 text-sm font-medium text-sfondo transition-opacity hover:opacity-85 disabled:opacity-50"
        >
          Promuovi
        </button>
        <button
          type="button"
          onClick={() => agisci(true)}
          disabled={!userId.trim() || inCorso}
          className="rounded-lg border border-bordo px-4 py-2 text-sm transition-colors hover:border-tenue disabled:opacity-50"
        >
          Revoca
        </button>
      </div>

      <p className="mt-4 text-xs text-tenue">
        Dopo la modifica l'interessato deve uscire e rientrare perche' il nuovo ruolo
        abbia effetto.
      </p>
    </section>
  )
}
