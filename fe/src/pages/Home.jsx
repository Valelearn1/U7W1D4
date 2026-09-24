import { motion } from 'motion/react'
import { Link } from 'react-router'
import Logo from '@/components/Logo'
import RivelaTesto from '@/components/RivelaTesto'

const MANIFESTO =
  'Ogni libro comincia con una riga che non hai ancora letto. Questo catalogo esiste per farti arrivare fin li senza farti aspettare.'

// Stagger d'ingresso: il contenitore non anima nulla di suo, serve solo a
// scandire i figli. E' la forma piu' leggera dell'effetto "hero stagger".
const contenitore = {
  fermo: {},
  entra: { transition: { staggerChildren: 0.09, delayChildren: 0.15 } },
}

const riga = {
  fermo: { opacity: 0, y: 18 },
  entra: { opacity: 1, y: 0, transition: { type: 'spring', bounce: 0.2, duration: 0.8 } },
}

export default function Home() {
  return (
    <>
      <section className="mx-auto max-w-4xl px-6 pt-20 pb-28 text-center sm:pt-28">
        <motion.div variants={contenitore} initial="fermo" animate="entra">
          <motion.div variants={riga} className="mb-8 flex justify-center">
            <Logo size={72} />
          </motion.div>

          <motion.h1
            variants={riga}
            className="font-titolo text-5xl tracking-tight text-balance sm:text-7xl"
          >
            Incipit
          </motion.h1>

          <motion.p
            variants={riga}
            className="mx-auto mt-5 max-w-lg text-base text-pretty text-tenue sm:text-lg"
          >
            Il catalogo della biblioteca. Cerca per titolo, autore, casa editrice o genere,
            e porta a casa quello che trovi.
          </motion.p>

          <motion.div variants={riga} className="mt-10 flex flex-wrap justify-center gap-3">
            <Link
              to="/catalogo"
              className="rounded-full bg-testo px-6 py-2.5 text-sm font-medium text-sfondo transition-opacity hover:opacity-85"
            >
              Sfoglia il catalogo
            </Link>
            <Link
              to="/registrati"
              className="rounded-full border border-bordo px-6 py-2.5 text-sm font-medium transition-colors hover:border-tenue"
            >
              Iscriviti
            </Link>
          </motion.div>
        </motion.div>
      </section>

      <RivelaTesto occhiello="Scorri" testo={MANIFESTO} />

      <section className="mx-auto max-w-4xl px-6 pb-28 text-center">
        <p className="font-titolo text-2xl text-balance">
          Pronto?{' '}
          <Link to="/catalogo" className="text-accento underline underline-offset-4">
            Comincia da qui
          </Link>
          .
        </p>
      </section>
    </>
  )
}
