import { AnimatePresence, motion } from 'motion/react'
import { useState } from 'react'
import { NavLink, Outlet, Link, useLocation, useNavigate } from 'react-router'
import Logo from '@/components/Logo'
import ToggleTema from '@/components/ToggleTema'
import { IconaBanco } from '@/components/Banco'
import { useSessione } from '@/components/Sessione'
import { useToast } from '@/components/Toast'

function VoceMenu({ to, children }) {
  return (
    <NavLink
      to={to}
      className={({ isActive }) =>
        `relative px-1 py-1 text-sm transition-colors ${
          isActive ? 'text-testo' : 'text-tenue hover:text-testo'
        }`
      }
    >
      {({ isActive }) => (
        <>
          {children}
          {isActive && (
            // layoutId: la sottolineatura non sparisce e riappare, scivola
            // da una voce all'altra perche' Motion le tratta come lo stesso
            // oggetto anche se sono in due nodi diversi dell'albero.
            <motion.span
              layoutId="sottolineatura-menu"
              className="absolute -bottom-0.5 left-0 h-px w-full bg-accento"
              transition={{ type: 'spring', bounce: 0.25, duration: 0.5 }}
            />
          )}
        </>
      )}
    </NavLink>
  )
}

// Il link all'area riservata compare solo a chi ci puo' entrare: le rotte
// restano comunque protette, questo e' solo per non mostrare porte chiuse.
function VoceAmministrazione() {
  const { operatore } = useSessione()
  if (!operatore) return null
  return <VoceMenu to="/amministrazione">Gestione</VoceMenu>
}

function Sessione() {
  const { utente, autenticato, operatore, inCaricamento, esci } = useSessione()
  const toast = useToast()
  const naviga = useNavigate()

  // Durante la validazione del token non mostriamo ne' "Accedi" ne' il nome:
  // lampeggerebbe da uno all'altro a ogni ricaricamento.
  if (inCaricamento) return <div className="h-8 w-20" />

  if (!autenticato) {
    return (
      <Link
        to="/accedi"
        className="rounded-full bg-testo px-4 py-1.5 text-sm font-medium text-sfondo transition-opacity hover:opacity-85"
      >
        Accedi
      </Link>
    )
  }

  async function disconnetti() {
    await esci()
    toast.info('Sessione chiusa')
    naviga('/')
  }

  return (
    <div className="flex items-center gap-3">
      <Link to="/profilo" className="hidden text-sm hover:text-accento sm:inline" title="Il tuo profilo">
        {utente.nome}
        {operatore && (
          <span className="ml-1.5 rounded-full bg-accento/12 px-1.5 py-0.5 text-[10px] text-accento">
            {utente.ruoli.includes('SuperUser') ? 'super' : 'admin'}
          </span>
        )}
      </Link>
      <button
        type="button"
        onClick={disconnetti}
        className="rounded-full border border-bordo px-3.5 py-1.5 text-sm text-tenue transition-colors hover:border-tenue hover:text-testo"
      >
        Esci
      </button>
    </div>
  )
}

export default function Layout() {
  const { pathname } = useLocation()
  const inHome = pathname === '/'
  const [hoverLogo, setHoverLogo] = useState(false)

  return (
    <div className="flex min-h-screen flex-col">
      <header className="sticky top-0 z-40 border-b border-bordo bg-sfondo/80 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-6xl items-center gap-6 px-4 sm:px-6">
          {/* Il nome riporta sempre alla home. Se ci siamo gia', invece di una
              navigazione a vuoto torniamo in cima alla pagina. */}
          <Link
            to="/"
            onClick={(e) => {
              if (inHome) {
                e.preventDefault()
                window.scrollTo({ top: 0, behavior: 'smooth' })
              }
            }}
            onMouseEnter={() => setHoverLogo(true)}
            onMouseLeave={() => setHoverLogo(false)}
            className="flex items-center gap-2.5"
            aria-label="Incipit, vai alla home"
          >
            <Logo size={28} steso={hoverLogo} />
            <span className="font-titolo text-lg tracking-tight">Incipit</span>
          </Link>

          <nav className="ml-auto flex items-center gap-5">
            <VoceMenu to="/catalogo">Catalogo</VoceMenu>
            <VoceMenu to="/prestiti">
              <span className="flex items-center gap-2.5">
                <span className="hidden sm:inline">Banco</span>
                <IconaBanco />
              </span>
            </VoceMenu>
            <VoceAmministrazione />
          </nav>

          <div className="flex items-center gap-2">
            <ToggleTema />
            <Sessione />
          </div>
        </div>
      </header>

      <main className="flex-1">
        <Outlet />
      </main>

      <footer className="border-t border-bordo">
        <div className="mx-auto flex max-w-6xl flex-col gap-2 px-4 py-8 text-xs text-tenue sm:flex-row sm:items-center sm:px-6">
          <p>Incipit &mdash; il catalogo della biblioteca.</p>
          <p className="sm:ml-auto">
            Copertine per gentile concessione di{' '}
            <a
              href="https://openlibrary.org"
              target="_blank"
              rel="noreferrer noopener"
              className="underline underline-offset-2 hover:text-testo"
            >
              Open Library
            </a>
            .
          </p>
        </div>
      </footer>
    </div>
  )
}
