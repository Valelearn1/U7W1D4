import { motion } from 'motion/react'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { useToast } from '@/components/Toast'
import { api } from '@/lib/api'

// Scegliere l'iscritto e' il punto piu' scomodo di tutta l'applicazione, e la
// colpa e' del backend: non esiste un endpoint che elenchi gli utenti.
// Ricostruiamo un elenco da due fonti:
//   1. i prestiti (PrestitoResponse porta UtenteBreve con id, nome, email)
//   2. una cache locale di chi e' gia' passato da questo banco
// e in ogni caso resta il campo per incollare il codice della tessera.

const CHIAVE_RECENTI = 'incipit-iscritti-recenti'

function leggiRecenti() {
  try {
    const g = localStorage.getItem(CHIAVE_RECENTI)
    const l = g ? JSON.parse(g) : []
    return Array.isArray(l) ? l : []
  } catch {
    return []
  }
}

export function ricordaIscritto(utente) {
  if (!utente?.id) return
  try {
    const recenti = leggiRecenti().filter((u) => u.id !== utente.id)
    const aggiornati = [utente, ...recenti].slice(0, 20)
    localStorage.setItem(CHIAVE_RECENTI, JSON.stringify(aggiornati))
  } catch {
    // niente spazio: pazienza, l'elenco dai prestiti resta
  }
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export default function SelettoreIscritto({ scelto, onScegli }) {
  const toast = useToast()
  const [conosciuti, setConosciuti] = useState(leggiRecenti)
  const [filtro, setFiltro] = useState('')
  const [situazione, setSituazione] = useState(null)

  useEffect(() => {
    api
      .tuttiPrestiti({ size: 100 })
      .then((p) => {
        const perId = new Map(leggiRecenti().map((u) => [u.id, u]))
        for (const prestito of p.content) {
          if (prestito.user) perId.set(prestito.user.id, prestito.user)
        }
        setConosciuti([...perId.values()].sort((a, b) => a.email.localeCompare(b.email)))
      })
      .catch(() => {
        // l'elenco resta quello locale
      })
  }, [])

  // Appena scelto qualcuno, mostriamo la sua situazione: chi ha libri in
  // ritardo va servito sapendolo.
  const caricaSituazione = useCallback((id) => {
    setSituazione(null)
    api
      .tuttiPrestiti({ userId: id, size: 100 })
      .then((p) => {
        const aperti = p.content.filter((x) => x.stato === 'APERTO').length
        const ritardo = p.content.filter((x) => x.stato === 'IN_RITARDO').length
        setSituazione({ aperti, ritardo, totale: p.totalElements })
      })
      .catch(() => setSituazione(null))
  }, [])

  useEffect(() => {
    if (scelto?.id) caricaSituazione(scelto.id)
    else setSituazione(null)
  }, [scelto, caricaSituazione])

  const filtrati = useMemo(() => {
    const q = filtro.trim().toLowerCase()
    if (!q) return conosciuti.slice(0, 6)
    return conosciuti
      .filter((u) =>
        `${u.nome} ${u.cognome} ${u.email}`.toLowerCase().includes(q),
      )
      .slice(0, 6)
  }, [conosciuti, filtro])

  function daCodice() {
    const codice = filtro.trim()
    if (!UUID.test(codice)) {
      toast.errore('Codice tessera non valido')
      return
    }
    const noto = conosciuti.find((u) => u.id === codice)
    // Se non l'abbiamo mai visto non possiamo risalire al nome: non esiste un
    // GET /api/user/{id}. Il prestito funziona comunque, il nome comparira'
    // dopo la prima registrazione.
    onScegli(noto ?? { id: codice, nome: 'Iscritto', cognome: '', email: 'letto da tessera' })
    setFiltro('')
  }

  if (scelto) {
    return (
      <div className="rounded-xl border border-bordo bg-sfondo p-3">
        <div className="flex items-center gap-3">
          <span className="grid size-9 shrink-0 place-items-center rounded-full bg-testo text-xs font-semibold text-sfondo">
            {(scelto.nome?.[0] ?? '?') + (scelto.cognome?.[0] ?? '')}
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium">
              {scelto.nome} {scelto.cognome}
            </p>
            <p className="truncate text-xs text-tenue">{scelto.email}</p>
          </div>
          <button
            type="button"
            onClick={() => onScegli(null)}
            className="shrink-0 rounded-full border border-bordo px-3 py-1 text-xs text-tenue transition-colors hover:border-tenue hover:text-testo"
          >
            Cambia
          </button>
        </div>

        {situazione && (situazione.aperti > 0 || situazione.ritardo > 0) && (
          <motion.p
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            className={`mt-3 text-xs ${situazione.ritardo > 0 ? 'text-accento' : 'text-tenue'}`}
          >
            {situazione.ritardo > 0
              ? `Attenzione: ha ${situazione.ritardo} ${situazione.ritardo === 1 ? 'libro in ritardo' : 'libri in ritardo'}.`
              : `Ha gia' ${situazione.aperti} ${situazione.aperti === 1 ? 'prestito in corso' : 'prestiti in corso'}.`}
          </motion.p>
        )}
      </div>
    )
  }

  return (
    <div>
      <div className="flex flex-wrap gap-2">
        <input
          value={filtro}
          onChange={(e) => setFiltro(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault()
              daCodice()
            }
          }}
          placeholder="Nome, email, o codice tessera"
          className="min-w-0 flex-1 rounded-lg border border-bordo bg-sfondo px-3.5 py-2 text-sm outline-none focus:border-tenue"
          aria-label="Cerca l'iscritto"
        />
        {UUID.test(filtro.trim()) && (
          <button
            type="button"
            onClick={daCodice}
            className="rounded-lg bg-testo px-4 py-2 text-sm font-medium text-sfondo transition-opacity hover:opacity-85"
          >
            Usa tessera
          </button>
        )}
      </div>

      {filtrati.length > 0 ? (
        <ul className="mt-2 flex flex-col gap-1">
          {filtrati.map((u) => (
            <li key={u.id}>
              <button
                type="button"
                onClick={() => onScegli(u)}
                className="flex w-full items-center gap-3 rounded-lg border border-bordo px-3 py-2 text-left transition-colors hover:border-tenue"
              >
                <span className="grid size-7 shrink-0 place-items-center rounded-full bg-bordo/70 text-[10px] font-semibold text-tenue">
                  {(u.nome?.[0] ?? '?') + (u.cognome?.[0] ?? '')}
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
      ) : (
        <p className="mt-2 text-xs text-tenue">
          {filtro.trim()
            ? 'Nessuna corrispondenza. Chiedi la tessera e incolla il codice.'
            : 'Cerca un iscritto o leggi il codice della sua tessera.'}
        </p>
      )}
    </div>
  )
}
