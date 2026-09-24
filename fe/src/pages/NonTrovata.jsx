import { Link } from 'react-router'
import Logo from '@/components/Logo'

export default function NonTrovata() {
  return (
    <div className="mx-auto flex max-w-2xl flex-col items-center px-6 py-28 text-center">
      <Logo size={56} />
      <h1 className="mt-8 font-titolo text-3xl tracking-tight">Pagina non trovata</h1>
      <p className="mt-3 text-sm text-tenue">
        Questo indirizzo non corrisponde a nessuna pagina di Incipit.
      </p>
      <Link
        to="/"
        className="mt-8 rounded-full bg-testo px-5 py-2 text-sm font-medium text-sfondo transition-opacity hover:opacity-85"
      >
        Torna alla home
      </Link>
    </div>
  )
}
