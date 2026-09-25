import { motion } from 'motion/react'
import { useRaccolta } from '@/components/Raccolta'
import { useToast } from '@/components/Toast'

// Banco e "Da leggere" sono due liste separate, una per ruolo. Senza questo
// avviso, chi passa da lettore a operatore vede sparire quello che aveva messo
// da parte e non ha modo di capire dov'e' finito.
export default function AvvisoAltraLista() {
  const raccolta = useRaccolta()
  const toast = useToast()

  if (!raccolta.altrove) return null

  const versoBanco = raccolta.modo === 'banco'

  return (
    <motion.div
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: 'spring', bounce: 0.2, duration: 0.6 }}
      className="mb-6 flex flex-wrap items-center gap-3 rounded-xl border border-bordo bg-superficie px-4 py-3"
    >
      <p className="min-w-0 flex-1 text-sm">
        {versoBanco
          ? `Hai ${raccolta.altrove} ${raccolta.altrove === 1 ? 'titolo' : 'titoli'} nella lista "Da leggere" di questo browser.`
          : `Ci sono ${raccolta.altrove} ${raccolta.altrove === 1 ? 'titolo rimasto' : 'titoli rimasti'} al banco di questo browser.`}
      </p>

      <button
        type="button"
        onClick={() => {
          const quanti = raccolta.importaDaAltra()
          if (quanti) toast.ok(`${quanti} ${quanti === 1 ? 'titolo spostato' : 'titoli spostati'}`)
        }}
        className="shrink-0 rounded-full bg-testo px-4 py-1.5 text-sm font-medium text-sfondo transition-opacity hover:opacity-85"
      >
        {versoBanco ? 'Portali al banco' : 'Spostali qui'}
      </button>
    </motion.div>
  )
}
