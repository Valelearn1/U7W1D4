import { motion, useMotionTemplate, useMotionValue, useSpring, useReducedMotion } from 'motion/react'
import { useState } from 'react'

// Tre livelli, in ordine: la copertina caricata dal backend (Libro.path),
// altrimenti quella di Open Library cercata per ISBN, altrimenti una generata
// qui dal genere e dal titolo.
//
// Il seed riempie gia' `path` con l'URL per CoverID, che non ha rate limit.
// La ricerca per ISBN resta come rete di sicurezza per i libri inseriti a mano.

const DIMENSIONI = { S: 'S', M: 'M', L: 'L' }

function isbnPulito(isbn) {
  if (isbn === null || isbn === undefined) return null
  const cifre = String(isbn).replace(/\D/g, '')
  return cifre.length === 10 || cifre.length === 13 ? cifre : null
}

export function urlOpenLibrary(isbn, dimensione = 'L') {
  const cifre = isbnPulito(isbn)
  if (!cifre) return null
  // `default=false` e' obbligatorio: senza, per un ISBN sconosciuto Open Library
  // risponde 200 con una GIF trasparente di 43 byte e onError non scatta mai.
  return `https://covers.openlibrary.org/b/isbn/${cifre}-${DIMENSIONI[dimensione]}.jpg?default=false`
}

function semeDa(testo) {
  let hash = 0
  for (let i = 0; i < testo.length; i++) hash = (hash * 31 + testo.charCodeAt(i)) | 0
  return Math.abs(hash)
}

/* ------------------------------------------------------------------ *
 * Copertina generata: quattro motivi geometrici scelti dal genere.
 * Serve davvero, perche' `path` e' nullable e un libro aggiunto a mano
 * dal pannello non ne ha una.
 * ------------------------------------------------------------------ */
function Motivo({ variante, tinta }) {
  const chiaro = `hsl(${tinta} 70% 72%)`
  const comune = { fill: 'none', stroke: chiaro, strokeWidth: 1.2, opacity: 0.5 }

  if (variante === 0) {
    // cerchi concentrici decentrati
    return (
      <>
        {[18, 30, 42, 54, 66].map((r) => (
          <circle key={r} cx="82" cy="34" r={r} {...comune} />
        ))}
      </>
    )
  }
  if (variante === 1) {
    // righe diagonali che si diradano
    return (
      <>
        {Array.from({ length: 14 }, (_, i) => (
          <line key={i} x1={-20 + i * 12} y1="0" x2={-60 + i * 12} y2="150" {...comune} opacity={0.12 + i * 0.03} />
        ))}
      </>
    )
  }
  if (variante === 2) {
    // archi sovrapposti, tipo dorso di libro aperto
    return (
      <>
        {[0, 1, 2, 3].map((i) => (
          <path key={i} d={`M0 ${58 + i * 16} Q50 ${18 + i * 16} 100 ${58 + i * 16}`} {...comune} />
        ))}
      </>
    )
  }
  // griglia tipografica
  return (
    <>
      {[20, 40, 60, 80].map((x) => (
        <line key={`v${x}`} x1={x} y1="0" x2={x} y2="150" {...comune} opacity="0.22" />
      ))}
      {[24, 48, 72, 96, 120].map((y) => (
        <line key={`h${y}`} x1="0" y1={y} x2="100" y2={y} {...comune} opacity="0.22" />
      ))}
    </>
  )
}

function CopertinaGenerata({ titolo, autore, genere, casaEditrice }) {
  const seme = semeDa(genere || titolo || 'incipit')
  const tinta = seme % 360
  const variante = seme % 4

  // Titoli lunghi in corpo grande escono dalla copertina: il corpo scende
  // a scalini invece di tagliare il testo.
  const corpo = titolo.length > 52 ? 7 : titolo.length > 32 ? 8.5 : titolo.length > 18 ? 10.5 : 13

  return (
    <svg viewBox="0 0 100 150" className="h-full w-full" preserveAspectRatio="xMidYMid slice" role="img" aria-label={`Copertina di ${titolo}`}>
      <defs>
        <linearGradient id={`g${seme}`} x1="0" y1="0" x2="0.6" y2="1">
          <stop offset="0%" stopColor={`hsl(${tinta} 46% 30%)`} />
          <stop offset="60%" stopColor={`hsl(${tinta} 42% 20%)`} />
          <stop offset="100%" stopColor={`hsl(${(tinta + 28) % 360} 38% 13%)`} />
        </linearGradient>

        {/* Grana: toglie l'aria da "gradiente CSS" e avvicina alla carta stampata. */}
        <filter id={`grana${seme}`}>
          <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="3" />
          <feColorMatrix type="saturate" values="0" />
        </filter>
      </defs>

      <rect width="100" height="150" fill={`url(#g${seme})`} />
      <g clipPath="inset(0)">
        <Motivo variante={variante} tinta={tinta} />
      </g>
      <rect width="100" height="150" filter={`url(#grana${seme})`} opacity="0.055" />

      {/* filetto della collana */}
      <rect x="9" y="14" width="16" height="1.6" fill="rgb(255 255 255 / 0.55)" />

      <foreignObject x="9" y="52" width="82" height="70">
        <div xmlns="http://www.w3.org/1999/xhtml" style={{ height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'flex-end' }}>
          <p
            style={{
              margin: 0,
              fontFamily: 'Fraunces, Georgia, serif',
              fontWeight: 600,
              fontSize: `${corpo}px`,
              lineHeight: 1.12,
              letterSpacing: '-0.015em',
              color: 'rgb(255 255 255 / 0.95)',
              overflowWrap: 'anywhere',
            }}
          >
            {titolo}
          </p>
          <p style={{ margin: '5px 0 0', fontFamily: 'Inter, sans-serif', fontSize: '5px', color: 'rgb(255 255 255 / 0.62)' }}>
            {autore}
          </p>
        </div>
      </foreignObject>

      <text x="9" y="140" fill="rgb(255 255 255 / 0.4)" fontSize="3.6" letterSpacing="0.5" fontFamily="Inter, sans-serif">
        {(casaEditrice || genere || '').toUpperCase().slice(0, 26)}
      </text>
    </svg>
  )
}

/* ------------------------------------------------------------------ *
 * Copertina vera e propria.
 * `inclina` accende l'inseguimento del puntatore: pesante su una griglia
 * di 24 card, giusto sulla scheda del singolo libro.
 * ------------------------------------------------------------------ */
export default function Copertina({ libro, dimensione = 'L', inclina = false, riempi = false, className = '' }) {
  const { titolo, autore, genere, casaEditrice, path, isbn } = libro
  const motoRidotto = useReducedMotion()

  const sorgenti = [path, urlOpenLibrary(isbn, dimensione)].filter(Boolean)
  const [tentativo, setTentativo] = useState(0)
  const [caricata, setCaricata] = useState(false)
  const sorgente = sorgenti[tentativo] ?? null

  // Posizione del puntatore, in percentuale sul riquadro. Inizializzate al
  // CENTRO: partendo da 0 il riflesso resta inchiodato all'angolo in alto a
  // sinistra e sbianca tutta la copertina finche' non ci passi sopra.
  const px = useMotionValue(50)
  const py = useMotionValue(50)
  const molla = { stiffness: 220, damping: 22, mass: 0.6 }
  // Inizializzati con un numero, non con un MotionValue: una molla agganciata
  // a una sorgente insegue quella e ignora i .set() imperativi.
  const rotX = useSpring(0, molla)
  const rotY = useSpring(0, molla)

  // Il riflesso segue il puntatore: e' quello che fa leggere la superficie
  // come lucida invece che piatta.
  const luce = useMotionTemplate`radial-gradient(130% 90% at ${px}% ${py}%, rgb(255 255 255 / 0.22), transparent 55%)`

  // Il riflesso esiste solo mentre il puntatore e' sopra: una superficie
  // lucida senza nessuno davanti non ha nessun riflesso da mostrare.
  const luceOpacita = useSpring(0, { stiffness: 180, damping: 26 })

  const attivo = inclina && !motoRidotto

  function muovi(evento) {
    if (!attivo) return
    const r = evento.currentTarget.getBoundingClientRect()
    const x = (evento.clientX - r.left) / r.width
    const y = (evento.clientY - r.top) / r.height
    px.set(x * 100)
    py.set(y * 100)
    rotY.set((x - 0.5) * 16)
    rotX.set((0.5 - y) * 12)
    luceOpacita.set(1)
  }

  function esci() {
    if (!attivo) return
    rotX.set(0)
    rotY.set(0)
    px.set(50)
    py.set(50)
    luceOpacita.set(0)
  }

  return (
    <div
      style={attivo ? { perspective: 1000 } : undefined}
      className={`${riempi ? 'h-full w-full' : ''} ${className}`}
    >
      <motion.div
        onMouseMove={muovi}
        onMouseLeave={esci}
        style={{
          // Dentro il flip della scheda il rapporto lo impone il genitore.
          aspectRatio: riempi ? undefined : '2 / 3',
          height: riempi ? '100%' : undefined,
          transformStyle: attivo ? 'preserve-3d' : undefined,
          rotateX: attivo ? rotX : undefined,
          rotateY: attivo ? rotY : undefined,
        }}
        whileHover={motoRidotto ? undefined : { scale: inclina ? 1 : 1.015 }}
        transition={{ type: 'spring', bounce: 0.2, duration: 0.5 }}
        className="relative overflow-hidden rounded-[3px] bg-bordo/50 shadow-[0_1px_2px_rgb(0_0_0/0.12),0_8px_18px_-8px_rgb(0_0_0/0.35)]"
      >
        {sorgente ? (
          <motion.img
            key={sorgente}
            src={sorgente}
            alt={`Copertina di ${titolo}`}
            loading="lazy"
            decoding="async"
            className="h-full w-full object-cover"
            initial={{ opacity: 0, scale: 1.04 }}
            animate={caricata ? { opacity: 1, scale: 1 } : { opacity: 0, scale: 1.04 }}
            transition={{ duration: 0.5, ease: [0.22, 0.61, 0.36, 1] }}
            onLoad={() => setCaricata(true)}
            onError={() => setTentativo((t) => t + 1)}
          />
        ) : (
          <CopertinaGenerata titolo={titolo} autore={autore} genere={genere} casaEditrice={casaEditrice} />
        )}

        {/* Dorso: la piega vicino alla costa. E' il dettaglio che trasforma
            un rettangolo con un'immagine in un oggetto che sembra un libro. */}
        <div
          className="pointer-events-none absolute inset-y-0 left-0 w-[9%]"
          style={{
            background:
              'linear-gradient(90deg, rgb(0 0 0 / 0.32) 0%, rgb(0 0 0 / 0.08) 38%, rgb(255 255 255 / 0.14) 62%, transparent 100%)',
          }}
          aria-hidden="true"
        />

        {/* Bordo interno: simula lo spessore della carta stampata e toglie
            l'effetto "immagine incollata". */}
        <div
          className="pointer-events-none absolute inset-0 rounded-[3px]"
          style={{ boxShadow: 'inset 0 0 0 1px rgb(255 255 255 / 0.10), inset 0 0 22px rgb(0 0 0 / 0.20)' }}
          aria-hidden="true"
        />

        {attivo && (
          <motion.div
            className="pointer-events-none absolute inset-0"
            style={{ backgroundImage: luce, opacity: luceOpacita }}
            aria-hidden="true"
          />
        )}
      </motion.div>
    </div>
  )
}
