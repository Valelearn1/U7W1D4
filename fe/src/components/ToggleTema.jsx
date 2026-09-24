import { AnimatePresence, motion } from 'motion/react'
import { useTema } from '@/lib/tema'

const transizione = { type: 'spring', bounce: 0.35, duration: 0.5 }

export default function ToggleTema() {
  const [tema, cambiaTema] = useTema()
  const scuro = tema === 'scuro'

  return (
    <motion.button
      type="button"
      onClick={cambiaTema}
      whileTap={{ scale: 0.88 }}
      className="grid size-9 place-items-center rounded-full border border-bordo text-tenue hover:text-testo"
      aria-label={scuro ? 'Passa al tema chiaro' : 'Passa al tema scuro'}
      title={scuro ? 'Tema chiaro' : 'Tema scuro'}
    >
      {/* mode="wait" evita che sole e luna si sovrappongano a meta' rotazione */}
      <AnimatePresence mode="wait" initial={false}>
        <motion.span
          key={tema}
          initial={{ rotate: -90, opacity: 0, scale: 0.6 }}
          animate={{ rotate: 0, opacity: 1, scale: 1 }}
          exit={{ rotate: 90, opacity: 0, scale: 0.6 }}
          transition={transizione}
          className="grid place-items-center"
        >
          {scuro ? <Luna /> : <Sole />}
        </motion.span>
      </AnimatePresence>
    </motion.button>
  )
}

function Sole() {
  return (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
      <circle cx="12" cy="12" r="4.2" />
      <path d="M12 2.5v2M12 19.5v2M2.5 12h2M19.5 12h2M5.2 5.2l1.4 1.4M17.4 17.4l1.4 1.4M18.8 5.2l-1.4 1.4M6.6 17.4l-1.4 1.4" />
    </svg>
  )
}

function Luna() {
  return (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M20 14.2A8.2 8.2 0 0 1 9.8 4a8.4 8.4 0 1 0 10.2 10.2Z" />
    </svg>
  )
}
