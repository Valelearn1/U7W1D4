import { motion, useReducedMotion } from 'motion/react'

// Il luccichio e' una banda di luce che attraversa il blocco. Il colore arriva
// da --c-luccichio (index.css) perche' su carta deve scurire e su nero schiarire:
// una singola banda bianca funzionerebbe solo sul tema scuro.
function Luccichio({ ritardo = 0 }) {
  return (
    <motion.div
      className="absolute inset-y-0 -left-full w-full"
      style={{
        background:
          'linear-gradient(90deg, transparent, var(--c-luccichio), var(--c-luccichio), transparent)',
      }}
      animate={{ x: ['0%', '300%'] }}
      transition={{ duration: 1.4, repeat: Infinity, ease: 'linear', delay: ritardo }}
      aria-hidden="true"
    />
  )
}

export function Blocco({ className = '', ritardo = 0 }) {
  const motoRidotto = useReducedMotion()

  return (
    <div className={`relative overflow-hidden rounded bg-bordo/60 ${className}`}>
      {!motoRidotto && <Luccichio ritardo={ritardo} />}
    </div>
  )
}

// Le misure ricalcano quelle della card vera (vedi CardLibro): se lo scheletro
// ha un'altezza diversa, al caricamento la griglia sobbalza.
export function ScheletroCardLibro({ ritardo = 0 }) {
  return (
    <div className="rounded-xl border border-bordo bg-superficie p-3">
      <Blocco className="aspect-2/3 w-full rounded-lg" ritardo={ritardo} />
      <Blocco className="mt-3 h-4 w-11/12" ritardo={ritardo + 0.08} />
      <Blocco className="mt-2 h-3 w-2/3" ritardo={ritardo + 0.16} />
      <div className="mt-3 flex items-center gap-2">
        <Blocco className="h-5 w-16 rounded-full" ritardo={ritardo + 0.24} />
        <Blocco className="h-5 w-12 rounded-full" ritardo={ritardo + 0.32} />
      </div>
    </div>
  )
}

export function GrigliaScheletro({ quanti = 8 }) {
  return (
    <div
      className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4"
      role="status"
      aria-label="Caricamento del catalogo"
    >
      {Array.from({ length: quanti }, (_, i) => (
        // Il ritardo scalato fa scorrere l'onda in diagonale sulla griglia
        // invece di far lampeggiare tutte le card insieme.
        <ScheletroCardLibro key={i} ritardo={i * 0.09} />
      ))}
    </div>
  )
}
