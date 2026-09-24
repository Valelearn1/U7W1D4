import { motion, useReducedMotion, useScroll, useTransform } from 'motion/react'
import { Fragment, useRef } from 'react'

// Adattato dall'esempio ufficiale "text scroll word reveal" di Motion.
// Niente stagger né varianti: l'opacita' di ogni parola e' una funzione pura
// del progresso di scroll, quindi non ci sono N componenti che si ri-renderizzano
// a ogni frame - il MotionValue scrive direttamente sullo stile.
const OPACITA_INIZIALE = 0.15
const AMPIEZZA = 0.8 // su quanta parte dello scroll si distribuiscono le parole
const DURATA_PAROLA = 0.2 // quanto dura la dissolvenza della singola parola

function intervalloParola(indice, totale) {
  const inizio = totale <= 1 ? 0 : (indice / (totale - 1)) * AMPIEZZA
  return { inizio, fine: Math.min(1, inizio + DURATA_PAROLA) }
}

function opacitaParola(progresso, { inizio, fine }) {
  if (progresso <= inizio) return OPACITA_INIZIALE
  if (progresso >= fine) return 1

  const avanzamento = (progresso - inizio) / (fine - inizio)
  return OPACITA_INIZIALE + (1 - OPACITA_INIZIALE) * avanzamento
}

function Parola({ children, progresso, indice, totale, motoRidotto }) {
  const intervallo = intervalloParola(indice, totale)
  const opacita = useTransform(progresso, (v) => opacitaParola(v, intervallo))

  return <motion.span style={motoRidotto ? undefined : { opacity: opacita }}>{children}</motion.span>
}

export default function RivelaTesto({ testo, occhiello }) {
  const sezione = useRef(null)
  const motoRidotto = useReducedMotion()

  const { scrollYProgress } = useScroll({
    target: sezione,
    offset: ['start start', 'end end'],
  })

  const parole = testo.split(' ')

  return (
    // La sezione e' alta il doppio della finestra: e' quello spazio che diventa
    // la "durata" dell'animazione mentre lo stage resta incollato al centro.
    <section ref={sezione} className="relative h-[220vh]" aria-labelledby="titolo-rivela">
      <div className="sticky top-0 flex h-screen items-center">
        <div className="mx-auto flex w-full max-w-4xl gap-6 px-6 sm:gap-10">
          {/* barra di avanzamento: cresce insieme allo scroll */}
          <div className="relative w-px shrink-0 bg-bordo" aria-hidden="true">
            <motion.span
              className="absolute inset-0 block origin-top bg-accento"
              style={{ scaleY: motoRidotto ? 1 : scrollYProgress }}
            />
          </div>

          <div>
            {occhiello && (
              <p className="mb-5 text-xs tracking-[0.2em] text-tenue uppercase">{occhiello}</p>
            )}
            <h2
              id="titolo-rivela"
              className="font-titolo text-3xl leading-snug font-normal text-balance sm:text-4xl md:text-5xl"
              // Lo screen reader legge la frase intera: le parole sono
              // aria-hidden perche' altrimenti verrebbero scandite una a una.
              aria-label={testo}
            >
              {parole.map((parola, indice) => (
                <Fragment key={`${parola}-${indice}`}>
                  <span aria-hidden="true">
                    <Parola
                      progresso={scrollYProgress}
                      indice={indice}
                      totale={parole.length}
                      motoRidotto={Boolean(motoRidotto)}
                    >
                      {parola}
                    </Parola>
                  </span>
                  {indice < parole.length - 1 ? ' ' : null}
                </Fragment>
              ))}
            </h2>
          </div>
        </div>
      </div>
    </section>
  )
}
