// In sviluppo BASE e' vuota e il proxy di Vite inoltra /api alla 8080.
// In produzione arriva da VITE_API_URL, iniettata durante la build.
const BASE = (import.meta.env.VITE_API_URL ?? '').replace(/\/$/, '')

const CHIAVE_TOKEN = 'incipit-token'

export function leggiToken() {
  try {
    return localStorage.getItem(CHIAVE_TOKEN)
  } catch {
    return null
  }
}

export function salvaToken(token) {
  try {
    if (token) localStorage.setItem(CHIAVE_TOKEN, token)
    else localStorage.removeItem(CHIAVE_TOKEN)
  } catch {
    // navigazione privata: la sessione vale finche' la scheda resta aperta
  }
}

export class ErroreApi extends Error {
  constructor(messaggio, stato, campi) {
    super(messaggio)
    this.name = 'ErroreApi'
    this.stato = stato
    // Mappa campo -> messaggio, valorizzata dai 400 di validazione.
    this.campi = campi ?? null
  }
}

// Il backend non parla con una voce sola:
//  - 400 di validazione  -> { status, errors: { campo: "messaggio" } }  (GlobalExceptionHandler)
//  - tutto il resto      -> { timestamp, status, error: "Conflict", path }
// Nel secondo caso il motivo vero della ResponseStatusException NON c'e': Spring
// lo omette finche' non si imposta server.error.include-message=always.
// Quindi "Conflict" e' tutto cio' che arriva, e va tradotto qui.
const PER_STATO = {
  400: 'Dati non validi',
  401: 'Sessione scaduta: rifai il login',
  403: 'Non hai i permessi per questa operazione',
  404: 'Risorsa non trovata',
  409: 'Operazione in conflitto con lo stato attuale',
  500: 'Errore del server',
}

// Bean Validation risponde in inglese ("must not be blank"): tradotti qui,
// perche' cambiare la lingua lato backend vorrebbe dire toccare i messaggi
// di ogni singola annotazione.
const TRADUZIONI = [
  [/^must not be blank$/i, 'obbligatorio'],
  [/^must not be null$/i, 'obbligatorio'],
  [/^must not be empty$/i, 'obbligatorio'],
  [/^must be a past date$/i, 'deve essere una data passata'],
  [/^must be a well-formed email address$/i, 'indirizzo email non valido'],
  [/^must be greater than 0$/i, 'deve essere maggiore di zero'],
  [/^size must be between (\d+) and (\d+)$/i, (_, a, b) => `da ${a} a ${b} caratteri`],
  [/^must be greater than or equal to (\S+)$/i, (_, v) => `minimo ${v}`],
  [/^must be less than or equal to (\S+)$/i, (_, v) => `massimo ${v}`],
  [/^numeric value out of bounds.*$/i, 'valore numerico fuori dai limiti'],
]

function traduci(messaggio) {
  for (const [schema, sostituto] of TRADUZIONI) {
    const corrispondenza = messaggio.match(schema)
    if (!corrispondenza) continue
    return typeof sostituto === 'function' ? sostituto(...corrispondenza) : sostituto
  }
  return messaggio
}

function interpretaErrore(testo, stato) {
  let dati = null
  try {
    dati = JSON.parse(testo)
  } catch {
    // non era JSON: usiamo il testo grezzo se c'e'
    return { messaggio: testo || `${stato}`, campi: null }
  }

  // 400 di validazione: l'elenco dei campi e' la cosa utile da mostrare
  if (dati.errors && typeof dati.errors === 'object') {
    const campi = Object.fromEntries(
      Object.entries(dati.errors).map(([campo, messaggio]) => [campo, traduci(String(messaggio))]),
    )
    const elenco = Object.entries(campi)
      .map(([campo, messaggio]) => `${campo}: ${messaggio}`)
      .join(' · ')
    return { messaggio: elenco || PER_STATO[400], campi }
  }

  // `message` c'e' solo se il backend e' configurato per includerlo
  if (dati.message) return { messaggio: dati.message, campi: null }
  if (dati.detail) return { messaggio: dati.detail, campi: null }

  // Resta "Conflict", "Forbidden"... cioe' il nome inglese dello stato:
  // meglio una frase in italiano.
  return { messaggio: PER_STATO[stato] ?? `Errore ${stato}`, campi: null }
}

async function chiama(percorso, opzioni = {}) {
  const { corpo, autenticata = false, ...resto } = opzioni

  const intestazioni = { ...resto.headers }
  if (corpo !== undefined) intestazioni['Content-Type'] = 'application/json'

  if (autenticata) {
    const token = leggiToken()
    if (token) intestazioni.Authorization = `Bearer ${token}`
  }

  const risposta = await fetch(`${BASE}${percorso}`, {
    ...resto,
    headers: intestazioni,
    body: corpo !== undefined ? JSON.stringify(corpo) : undefined,
  })

  if (!risposta.ok) {
    const testo = await risposta.text()
    const { messaggio, campi } = interpretaErrore(testo, risposta.status)
    throw new ErroreApi(messaggio, risposta.status, campi)
  }

  return risposta.status === 204 ? undefined : risposta.json()
}

// Scarta i filtri vuoti: mandare `titolo=` al backend restringe la ricerca
// a chi ha il titolo vuoto invece di ignorare il filtro.
function queryString(parametri) {
  const q = new URLSearchParams()
  for (const [chiave, valore] of Object.entries(parametri)) {
    if (valore === undefined || valore === null || valore === '') continue
    q.set(chiave, String(valore))
  }
  const s = q.toString()
  return s ? `?${s}` : ''
}

export const api = {
  indirizzo: BASE || '(stessa origine, proxy di Vite)',

  stato: () => chiama('/api/stato'),

  // --- libri ---
  libri: ({ page = 0, size = 20 } = {}) => chiama(`/api/book/all${queryString({ page, size })}`),

  // Attenzione: /search e' un POST ma i parametri li legge con @ModelAttribute,
  // cioe' dalla query string, non dal corpo. Quindi niente body qui.
  // I filtri accettati sono quelli di LibroSearchParams: q, titolo, autore,
  // casaEditrice, genereId, annoDa, annoA, prezzoMin, prezzoMax,
  // copertinaRigida, disponibile.
  cercaLibri: ({ page = 0, size = 20, sort, ...filtri } = {}) =>
    chiama(`/api/book/search${queryString({ ...filtri, page, size, sort })}`, { method: 'POST' }),

  // --- generi ---
  // allGeneri e' @PreAuthorize("isAuthenticated()"): da anonimo risponde 401,
  // quindi il filtro per genere si mostra solo a chi ha fatto il login.
  generi: () => chiama('/api/generi/allGeneri', { autenticata: true }),

  // --- utente ---
  // Attenzione: LoginRequest si chiama `username`, non `email`, anche se il
  // valore e' l'indirizzo di posta.
  login: (email, password) =>
    chiama('/api/user/login', { method: 'POST', corpo: { username: email, password } }),
  registrati: (dati) => chiama('/api/user/register', { method: 'POST', corpo: dati }),
  logout: () => chiama('/api/user/logout', { method: 'POST', autenticata: true }),
  io: () => chiama('/api/user/me', { autenticata: true }),
  rinnova: () => chiama('/api/user/refresh', { method: 'POST', autenticata: true }),

  // --- prestiti ---
  mieiPrestiti: (filtri = {}) =>
    chiama(`/api/prestiti/UserPrestiti${queryString(filtri)}`, { autenticata: true }),
  tuttiPrestiti: (filtri = {}) =>
    chiama(`/api/prestiti/AllPrestiti${queryString(filtri)}`, { autenticata: true }),
  nuovoPrestito: (corpo) =>
    chiama('/api/prestiti/NewPrestito', { method: 'POST', corpo, autenticata: true }),
  chiudiPrestito: (corpo) =>
    chiama('/api/prestiti/ClosePrestito', { method: 'PATCH', corpo, autenticata: true }),
  estendiPrestito: (corpo) =>
    chiama('/api/prestiti/ExtendPrestito', { method: 'PATCH', corpo, autenticata: true }),

  // --- amministrazione ---
  nuovoGenere: (nome) =>
    chiama('/api/generi/newGenere', { method: 'POST', corpo: { nome }, autenticata: true }),
  nuovoLibro: (corpo) =>
    chiama('/api/book/newLibro', { method: 'POST', corpo, autenticata: true }),
  aggiungiCopie: (idLibro, copie) =>
    chiama('/api/book/addLibro', { method: 'PATCH', corpo: { idLibro, copie }, autenticata: true }),

  // Costanti: leggere e' Admin+, scrivere e' solo SuperUser.
  costanti: () => chiama('/api/costanti/all', { autenticata: true }),
  modificaCostante: (id, valore) =>
    chiama('/api/costanti/editCostante', { method: 'PATCH', corpo: { id, valore }, autenticata: true }),

  // grantAdmin/revokeAdmin sono hasRole('SuperUser').
  promuoviAdmin: (userId) =>
    chiama(`/api/role/grantAdmin/${userId}`, { method: 'POST', autenticata: true }),
  revocaAdmin: (userId) =>
    chiama(`/api/role/revokeAdmin/${userId}`, { method: 'DELETE', autenticata: true }),
}
