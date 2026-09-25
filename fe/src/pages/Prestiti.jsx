import { Navigate } from 'react-router'
import ElencoPrestiti from '@/components/Prestiti'
import AvvisoScadenze from '@/components/AvvisoScadenze'
import { Blocco } from '@/components/Scheletro'
import { useSessione } from '@/components/Sessione'

export default function Prestiti() {
  const { autenticato, inCaricamento } = useSessione()

  if (inCaricamento) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6">
        <Blocco className="h-8 w-48" />
        <Blocco className="mt-6 h-24 w-full rounded-xl" ritardo={0.1} />
      </div>
    )
  }

  if (!autenticato) return <Navigate to="/accedi" state={{ da: '/prestiti' }} replace />

  return (
    <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6">
      <div className="mb-8">
        <AvvisoScadenze />
      </div>
      <ElencoPrestiti intestazione />
    </div>
  )
}
