import { motion } from 'motion/react'
import { useState } from 'react'
import { Link, useNavigate } from 'react-router'
import Logo from '@/components/Logo'
import { Campo } from '@/pages/Accedi'
import { useSessione } from '@/components/Sessione'
import { useToast } from '@/components/Toast'
import { api } from '@/lib/api'

const contenitore = { fermo: {}, entra: { transition: { staggerChildren: 0.06, delayChildren: 0.1 } } }
const riga = {
  fermo: { opacity: 0, y: 14 },
  entra: { opacity: 1, y: 0, transition: { type: 'spring', bounce: 0.2, duration: 0.7 } },
}

const VUOTO = {
  nome: '',
  cognome: '',
  email: '',
  password: '',
  dataDiNascita: '',
  indirizzo: '',
}

export default function Registrati() {
  const { accedi } = useSessione()
  const toast = useToast()
  const naviga = useNavigate()

  const [dati, setDati] = useState(VUOTO)
  const [inCorso, setInCorso] = useState(false)
  const [erroriCampo, setErroriCampo] = useState({})
  const [emailOccupata, setEmailOccupata] = useState(false)

  const aggiorna = (campo) => (e) => {
    setDati((d) => ({ ...d, [campo]: e.target.value }))
    // L'errore sparisce appena si corregge, non al prossimo invio.
    setErroriCampo((err) => (err[campo] ? { ...err, [campo]: undefined } : err))
    if (campo === 'email') setEmailOccupata(false)
  }

  async function invia(evento) {
    evento.preventDefault()
    setInCorso(true)
    setErroriCampo({})
    setEmailOccupata(false)
    try {
      await api.registrati(dati)
      // register risponde 201 senza corpo: per entrare serve comunque il login.
      await accedi(dati.email, dati.password)
      toast.ok('Account creato')
      naviga('/catalogo', { replace: true })
    } catch (errore) {
      // Il backend risponde 409 senza spiegare: sul register l'unico conflitto
      // possibile e' l'email gia' presente (UserService.register).
      if (errore.stato === 409) {
        setEmailOccupata(true)
        toast.errore('Questa email e\' gia\' registrata')
      } else if (errore.campi) {
        setErroriCampo(errore.campi)
        toast.errore('Controlla i campi segnalati')
      } else {
        toast.errore(errore.message || 'Registrazione non riuscita')
      }
    } finally {
      setInCorso(false)
    }
  }

  return (
    <div className="mx-auto max-w-md px-6 py-20">
      <motion.form variants={contenitore} initial="fermo" animate="entra" onSubmit={invia}>
        <motion.div variants={riga} className="mb-8 flex justify-center">
          <Logo size={48} />
        </motion.div>

        <motion.h1 variants={riga} className="text-center font-titolo text-3xl tracking-tight">
          Registrati
        </motion.h1>
        <motion.p variants={riga} className="mt-2 mb-8 text-center text-sm text-tenue">
          Bastano pochi dati.
        </motion.p>

        <div className="grid gap-4 sm:grid-cols-2">
          <motion.div variants={riga}>
            <Campo etichetta="Nome" value={dati.nome} onChange={aggiorna('nome')} errore={erroriCampo.nome} required />
          </motion.div>
          <motion.div variants={riga}>
            <Campo etichetta="Cognome" value={dati.cognome} onChange={aggiorna('cognome')} errore={erroriCampo.cognome} required />
          </motion.div>
        </div>

        <motion.div variants={riga} className="mt-4">
          <Campo
            etichetta="Email"
            type="email"
            value={dati.email}
            onChange={aggiorna('email')}
            autoComplete="username"
            errore={emailOccupata ? 'Email gia\' registrata — prova ad accedere' : erroriCampo.email}
            required
          />
        </motion.div>

        <motion.div variants={riga} className="mt-4">
          <Campo
            etichetta="Password"
            type="password"
            value={dati.password}
            onChange={aggiorna('password')}
            autoComplete="new-password"
            // Il backend valida @Size(min = 8, max = 72): meglio dirlo qui che
            // farlo scoprire con un 400.
            minLength={8}
            maxLength={72}
            errore={erroriCampo.password}
            aiuto="Almeno 8 caratteri."
            required
          />
        </motion.div>

        <motion.div variants={riga} className="mt-4">
          <Campo
            etichetta="Data di nascita"
            type="date"
            value={dati.dataDiNascita}
            onChange={aggiorna('dataDiNascita')}
            // @Past sul backend: oggi non e' valido
            max={new Date(Date.now() - 86400000).toISOString().slice(0, 10)}
            errore={erroriCampo.dataDiNascita}
            required
          />
        </motion.div>

        <motion.div variants={riga} className="mt-4">
          <Campo etichetta="Indirizzo" value={dati.indirizzo} onChange={aggiorna('indirizzo')} errore={erroriCampo.indirizzo} required />
        </motion.div>

        <motion.button
          variants={riga}
          type="submit"
          disabled={inCorso}
          whileTap={{ scale: 0.97 }}
          className="mt-7 w-full rounded-full bg-testo py-2.5 text-sm font-medium text-sfondo transition-opacity hover:opacity-85 disabled:opacity-50"
        >
          {inCorso ? 'Creazione...' : 'Crea account'}
        </motion.button>

        <motion.p variants={riga} className="mt-6 text-center text-xs text-tenue">
          Hai gia' un account?{' '}
          <Link to="/accedi" className="text-accento underline underline-offset-2">
            Accedi
          </Link>
        </motion.p>
      </motion.form>
    </div>
  )
}
