import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { api, leggiToken, salvaToken } from '@/lib/api'

const RUOLI_OPERATORE = ['Admin', 'SuperUser']

const ContestoSessione = createContext(null)

export function useSessione() {
  const contesto = useContext(ContestoSessione)
  if (!contesto) throw new Error('useSessione va usato dentro <ProviderSessione>')
  return contesto
}

export function ProviderSessione({ children }) {
  const [utente, setUtente] = useState(null)
  // `true` all'avvio: c'e' un token da validare prima di sapere chi siamo.
  const [inCaricamento, setInCaricamento] = useState(Boolean(leggiToken()))

  // Il token in localStorage puo' essere scaduto o revocato (il backend tiene
  // una tabella TokenJwt): l'unico modo di saperlo e' chiedere /me.
  useEffect(() => {
    if (!leggiToken()) return

    let annullato = false
    api
      .io()
      .then((u) => {
        if (!annullato) setUtente(u)
      })
      .catch(() => {
        if (annullato) return
        salvaToken(null)
        setUtente(null)
      })
      .finally(() => {
        if (!annullato) setInCaricamento(false)
      })

    return () => {
      annullato = true
    }
  }, [])

  const accedi = useCallback(async (email, password) => {
    const risposta = await api.login(email, password)
    salvaToken(risposta.token)
    const u = await api.io()
    setUtente(u)
    return u
  }, [])

  const esci = useCallback(async () => {
    try {
      await api.logout()
    } catch {
      // token gia' scaduto o revocato: l'importante e' pulire da questa parte
    }
    salvaToken(null)
    setUtente(null)
  }, [])

  const valore = useMemo(
    () => ({
      utente,
      inCaricamento,
      autenticato: Boolean(utente),
      operatore: Boolean(utente?.ruoli?.some((r) => RUOLI_OPERATORE.includes(r))),
      accedi,
      esci,
    }),
    [utente, inCaricamento, accedi, esci],
  )

  return <ContestoSessione.Provider value={valore}>{children}</ContestoSessione.Provider>
}
