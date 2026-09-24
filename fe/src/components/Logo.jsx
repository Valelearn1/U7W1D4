import { motion, useReducedMotion, useSpring } from 'motion/react'
import { useEffect, useState } from 'react'

// La I di Incipit: grazia superiore, asta, e al posto del piede un segnalibro.
// Il disegno e' lo stesso di public/favicon.svg, qui in versione animata:
// prima si traccia il contorno (pathLength), poi il nastro si riempie.
const NASTRO = 'M6.4 10.5 H17.6 V29 L12 24.1 L6.4 29 Z'

const tratto = {
  fermo: { pathLength: 0, opacity: 0 },
  disegna: (i) => ({
    pathLength: 1,
    opacity: 1,
    transition: {
      pathLength: { type: 'spring', duration: 1.1, bounce: 0 },
      opacity: { duration: 0.15 },
      delay: 0.15 + i * 0.22,
    },
  }),
}

const riempimento = {
  fermo: { opacity: 0 },
  disegna: { opacity: 1, transition: { duration: 0.5, delay: 1.3 } },
}

const MOLLA = { bounce: 0.45, duration: 0.7 }

/**
 * `steso` permette di pilotare il nastro da fuori: nell'header lo stiramento
 * deve scattare passando sopra tutto il link "Incipit", non solo sopra il
 * disegno. Se non viene passato, il logo si arrangia da solo.
 */
export default function Logo({ size = 32, animato = true, steso, className = '' }) {
  const motoRidotto = useReducedMotion()
  const [hoverInterno, setHoverInterno] = useState(false)

  const disegna = animato && !motoRidotto
  const allungato = (steso ?? hoverInterno) && !motoRidotto

  // Lo stiramento passa da un MotionValue in `style`, non da `animate`.
  // Con `animate` sul <g> i due path figli smetterebbero di ereditare la
  // variante "disegna" dall'<svg> e il nastro non si disegnerebbe piu':
  // un nodo che dichiara il proprio `animate` interrompe la propagazione.
  // `style` invece non fa parte di quella catena.
  const scalaNastro = useSpring(1, MOLLA)
  useEffect(() => {
    scalaNastro.set(allungato ? 1.28 : 1)
  }, [allungato, scalaNastro])

  return (
    <motion.svg
      viewBox="0 0 24 32"
      width={(size * 24) / 32}
      height={size}
      className={className}
      aria-hidden="true"
      initial={disegna ? 'fermo' : false}
      animate="disegna"
      onHoverStart={() => setHoverInterno(true)}
      onHoverEnd={() => setHoverInterno(false)}
      overflow="visible"
    >
      {/* Area sensibile. Serve davvero: con fill="none" l'SVG riceve gli eventi
          del puntatore solo sui pixel disegnati (pointer-events: visiblePainted),
          quindi senza questo rettangolo bisognerebbe centrare un tratto da 2px.
          `transparent` viene considerato dipinto, `none` no. */}
      <rect x="0" y="0" width="24" height="32" fill="transparent" />

      <motion.line
        x1="6"
        y1="4.2"
        x2="18"
        y2="4.2"
        stroke="currentColor"
        strokeWidth="2.4"
        strokeLinecap="butt"
        variants={tratto}
        custom={0}
      />
      <motion.line
        x1="12"
        y1="4.2"
        x2="12"
        y2="10.5"
        stroke="currentColor"
        strokeWidth="2.4"
        strokeLinecap="butt"
        variants={tratto}
        custom={1}
      />

      {/* L'origine in cima all'asta: il nastro scende invece di gonfiarsi.
          transformBox: 'view-box' e' obbligatorio, altrimenti l'origine viene
          interpretata nel sistema di riferimento sbagliato. */}
      <motion.g
        style={{
          scaleY: scalaNastro,
          transformBox: 'view-box',
          transformOrigin: '12px 10.5px',
        }}
      >
        <motion.path
          d={NASTRO}
          fill="none"
          stroke="var(--c-accento)"
          strokeWidth="1.6"
          strokeLinejoin="round"
          variants={tratto}
          custom={2}
        />
        <motion.path d={NASTRO} fill="var(--c-accento)" stroke="none" variants={riempimento} />
      </motion.g>
    </motion.svg>
  )
}
