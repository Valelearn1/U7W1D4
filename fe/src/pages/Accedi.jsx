import { motion } from 'motion/react'
import { useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router'
import Logo from '@/components/Logo'
import { useSessione } from '@/components/Sessione'
import { useToast } from '@/components/Toast'

const contenitore = { fermo: {}, entra: { transition: { staggerChildren: 0.07, delayChildren: 0.1 } } }
const riga = {
  fermo: { opacity: 0, y: 14 },
  entra: { opacity: 1, y: 0, transition: { type: 'spring', bounce: 0.2, duration: 0.7 } },
}

export default function Accedi() {
  const { accedi } = useSessione()
  const toast = useToast()
  const naviga = useNavigate()
  const posizione = useLocation()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [inCorso, setInCorso] = useState(false)

  async function invia(evento) {
    evento.preventDefault()
    setInCorso(true)
    try {
      const utente = await accedi(email, password)
      toast.ok(`Bentornata, ${utente.nome}`)
      // Torna da dove si e' stati rimbalzati, altrimenti al catalogo.
      naviga(posizione.state?.da ?? '/catalogo', { replace: true })
    } catch (errore) {
      // 401 qui significa una cosa sola, e "Sessione scaduta" sarebbe assurdo
      // su una schermata di login.
      toast.errore(errore.stato === 401 ? 'Email o password non corretti' : errore.message)
    } finally {
      setInCorso(false)
    }
  }

  return (
    <div className="mx-auto max-w-sm px-6 py-20">
      <motion.form variants={contenitore} initial="fermo" animate="entra" onSubmit={invia}>
        <motion.div variants={riga} className="mb-8 flex justify-center">
          <Logo size={48} />
        </motion.div>

        <motion.h1 variants={riga} className="text-center font-titolo text-3xl tracking-tight">
          Accedi
        </motion.h1>
        <motion.p variants={riga} className="mt-2 mb-8 text-center text-sm text-tenue">
          Per registrare i prestiti al banco.
        </motion.p>

        <motion.div variants={riga}>
          <Campo
            etichetta="Email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="username"
            required
          />
        </motion.div>

        <motion.div variants={riga} className="mt-4">
          <Campo
            etichetta="Password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="current-password"
            required
          />
        </motion.div>

        <motion.button
          variants={riga}
          type="submit"
          disabled={inCorso}
          whileTap={{ scale: 0.97 }}
          className="mt-7 w-full rounded-full bg-testo py-2.5 text-sm font-medium text-sfondo transition-opacity hover:opacity-85 disabled:opacity-50"
        >
          {inCorso ? 'Accesso...' : 'Entra'}
        </motion.button>

        <motion.p variants={riga} className="mt-6 text-center text-xs text-tenue">
          Non hai un account?{' '}
          <Link to="/registrati" className="text-accento underline underline-offset-2">
            Registrati
          </Link>
        </motion.p>
      </motion.form>
    </div>
  )
}

export function Campo({ etichetta, errore, aiuto, fondo = 'superficie', ...props }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs tracking-[0.12em] text-tenue uppercase">
        {etichetta}
      </span>
      <input
        {...props}
        aria-invalid={errore ? 'true' : undefined}
        className={`w-full rounded-lg border px-3.5 py-2.5 text-sm outline-none transition-colors ${
          fondo === 'sfondo' ? 'bg-sfondo' : 'bg-superficie'
        } ${errore ? 'border-accento' : 'border-bordo focus:border-tenue'}`}
      />
      {errore ? (
        <p className="mt-1.5 text-xs text-accento">{errore}</p>
      ) : aiuto ? (
        <p className="mt-1.5 text-xs text-tenue">{aiuto}</p>
      ) : null}
    </label>
  )
}
