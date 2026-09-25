import { motion } from 'motion/react'
import { useState } from 'react'
import Logo from '@/components/Logo'

// La tessera della biblioteca. Non e' decorazione: il pannello operatore ha
// bisogno dell'identificativo dell'iscritto e il backend non espone nessun
// elenco degli utenti. Cosi' l'iscritto se lo porta dietro, come succede
// davvero allo sportello.

// Barre ricavate dalle cifre esadecimali dell'id: sempre le stesse per lo
// stesso utente. Non e' un Code128 leggibile da uno scanner - qui serve a
// rendere riconoscibile la tessera, il codice si legge sotto.
function Barre({ id }) {
  const cifre = id.replace(/-/g, '')
  const barre = []
  let x = 0

  for (let i = 0; i < cifre.length; i++) {
    const v = parseInt(cifre[i], 16)
    const larghezza = 1 + (v % 3)
    if (i % 2 === 0) barre.push({ x, larghezza })
    x += larghezza + 1
  }

  return (
    <svg viewBox={`0 0 ${x} 20`} preserveAspectRatio="none" className="h-8 w-full" aria-hidden="true">
      {barre.map((b, i) => (
        <rect key={i} x={b.x} y="0" width={b.larghezza} height="20" fill="currentColor" />
      ))}
    </svg>
  )
}

export default function Tessera({ utente }) {
  const [copiato, setCopiato] = useState(false)

  async function copia() {
    try {
      await navigator.clipboard.writeText(utente.id)
      setCopiato(true)
      window.setTimeout(() => setCopiato(false), 1800)
    } catch {
      // clipboard negata (http o permessi): il codice resta leggibile sotto
    }
  }

  const anno = new Date(utente.createdAt).getFullYear()

  return (
    <motion.div
      initial={{ opacity: 0, y: 16, rotateX: -8 }}
      animate={{ opacity: 1, y: 0, rotateX: 0 }}
      transition={{ type: 'spring', bounce: 0.25, duration: 0.8 }}
      style={{ perspective: 900 }}
    >
      <div className="relative overflow-hidden rounded-2xl bg-testo p-5 text-sfondo shadow-lg shadow-black/15">
        {/* filigrana */}
        <div
          className="pointer-events-none absolute -top-10 -right-10 size-44 rounded-full opacity-[0.07]"
          style={{ background: 'radial-gradient(circle, currentColor 0%, transparent 70%)' }}
          aria-hidden="true"
        />

        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-2">
            <Logo size={22} animato={false} />
            <span className="font-titolo text-sm tracking-tight">Incipit</span>
          </div>
          <span className="text-[10px] tracking-[0.18em] uppercase opacity-60">Tessera</span>
        </div>

        <p className="mt-6 font-titolo text-xl leading-tight">
          {utente.nome} {utente.cognome}
        </p>
        <p className="text-xs opacity-60">Iscritto dal {anno}</p>

        <div className="mt-5 opacity-90">
          <Barre id={utente.id} />
        </div>

        <button
          type="button"
          onClick={copia}
          className="mt-2 w-full text-left font-mono text-[10px] tracking-wider opacity-70 transition-opacity hover:opacity-100"
          title="Copia il codice"
        >
          {copiato ? '✓ codice copiato' : utente.id}
        </button>
      </div>

      <p className="mt-3 text-xs text-tenue">
        Mostra questo codice al banco: serve al personale per registrare i tuoi prestiti.
      </p>
    </motion.div>
  )
}
