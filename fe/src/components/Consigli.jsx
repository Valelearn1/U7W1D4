import { motion } from 'motion/react'
import { useEffect, useState } from 'react'
import { Link } from 'react-router'
import Copertina from '@/components/Copertina'
import { useSessione } from '@/components/Sessione'
import { api } from '@/lib/api'

// "Dagli autori che hai letto".
//
// Il genere sarebbe stato un aggancio migliore, ma PrestitoResponse.LibroBreve
// porta solo id, isbn, titolo e autore: il genere non c'e'. L'autore si', ed e'
// comunque un buon criterio.
export default function Consigli() {
  const { autenticato } = useSessione()
  const [proposte, setProposte] = useState([])
  const [autori, setAutori] = useState([])

  useEffect(() => {
    if (!autenticato) return
    let annullato = false

    async function calcola() {
      const storico = await api.mieiPrestiti({ size: 100 })
      const lettiId = new Set(storico.content.map((p) => p.libro.id))

      // Gli autori piu' frequenti nello storico, al massimo tre.
      const conteggio = new Map()
      for (const p of storico.content) {
        const a = p.libro.autore
        if (a) conteggio.set(a, (conteggio.get(a) ?? 0) + 1)
      }
      const preferiti = [...conteggio.entries()]
        .sort((a, b) => b[1] - a[1])
        .slice(0, 3)
        .map(([a]) => a)

      if (!preferiti.length) return

      const risultati = await Promise.all(
        preferiti.map((a) =>
          api
            .cercaLibri({ autore: a, disponibile: true, size: 8 })
            .then((r) => r.content)
            .catch(() => []),
        ),
      )

      // Fuori i titoli gia' presi in prestito: consigliare quello che hai
      // appena restituito non aiuta.
      const perId = new Map()
      for (const libro of risultati.flat()) {
        if (!lettiId.has(libro.id)) perId.set(libro.id, libro)
      }

      if (!annullato) {
        setAutori(preferiti)
        setProposte([...perId.values()].slice(0, 4))
      }
    }

    calcola().catch(() => {
      // nessun consiglio: la sezione semplicemente non compare
    })

    return () => {
      annullato = true
    }
  }, [autenticato])

  if (proposte.length === 0) return null

  return (
    <section className="mt-12">
      <h2 className="font-titolo text-xl tracking-tight">Dal tuo scaffale</h2>
      <p className="mt-1 text-sm text-tenue">
        Disponibili adesso, da {autori.slice(0, 2).join(' e ')}
        {autori.length > 2 && ' e altri che hai letto'}.
      </p>

      <div className="mt-5 grid grid-cols-2 gap-4 sm:grid-cols-4">
        {proposte.map((libro, i) => (
          <motion.div
            key={libro.id}
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ type: 'spring', bounce: 0.2, duration: 0.6, delay: i * 0.06 }}
          >
            <Link to={`/libro/${libro.id}`} state={{ libro }} className="block">
              <Copertina libro={libro} dimensione="M" inclina />
              <p className="mt-2 line-clamp-2 font-titolo text-xs leading-snug font-semibold">
                {libro.titolo}
              </p>
              <p className="truncate text-[11px] text-tenue">{libro.autore}</p>
            </Link>
          </motion.div>
        ))}
      </div>
    </section>
  )
}
