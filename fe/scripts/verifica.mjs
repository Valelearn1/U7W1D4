// Prova da capo il giro completo contro il backend vero: catalogo, ricerca,
// registrazione, login, permessi, prestito, copie scalate, restituzione.
//
//   npm run verifica
//   npm run verifica -- --api https://app-be.onrender.com
//
// Crea un utente di prova a ogni esecuzione (email con timestamp): utile per
// controllare che il deploy sia sano, meno per tenere pulito il database.

function argomento(nome, predefinito) {
  const i = process.argv.indexOf(`--${nome}`)
  return i !== -1 && process.argv[i + 1] ? process.argv[i + 1] : predefinito
}

const API = argomento('api', process.env.VITE_API_URL || 'http://localhost:8080').replace(/\/$/, '')
let token = null
const passi = []

async function chiama(percorso, opz = {}) {
  const { corpo, ...resto } = opz
  const h = {}
  if (corpo !== undefined) h['Content-Type'] = 'application/json'
  if (token) h.Authorization = `Bearer ${token}`
  const r = await fetch(`${API}${percorso}`, { ...resto, headers: h, body: corpo !== undefined ? JSON.stringify(corpo) : undefined })
  const t = await r.text()
  if (!r.ok) throw new Error(`${r.status} ${t.slice(0, 160)}`)
  return t ? JSON.parse(t) : undefined
}

function ok(nome, dettaglio) { passi.push(`  OK   ${nome}${dettaglio ? ' — ' + dettaglio : ''}`) }
function ko(nome, e) { passi.push(`  FAIL ${nome} — ${e.message}`) }

// 1. catalogo anonimo (la home e il catalogo devono funzionare senza login)
try {
  const c = await chiama('/api/book/all?page=0&size=24')
  ok('catalogo anonimo', `${c.totalElements} titoli, ${c.totalPages} pagine, ${c.content.filter(b => b.path).length}/${c.content.length} con copertina`)
} catch (e) { ko('catalogo anonimo', e) }

// 2. ricerca testuale
try {
  const s = await chiama('/api/book/search?q=calvino&page=0&size=5', { method: 'POST' })
  ok('ricerca "calvino"', `${s.totalElements} risultati`)
} catch (e) { ko('ricerca testuale', e) }

// 3. registrazione di un utente nuovo
const nuovaEmail = `prova${Date.now()}@incipit.it`
try {
  await chiama('/api/user/register', { method: 'POST', corpo: {
    email: nuovaEmail, password: 'password123', dataDiNascita: '1999-04-12',
    nome: 'Prova', cognome: 'Incipit', indirizzo: 'Via Roma 1',
  }})
  ok('registrazione', nuovaEmail)
} catch (e) { ko('registrazione', e) }

// 4. login con l'utente appena creato
let utenteNormale = null
try {
  const l = await chiama('/api/user/login', { method: 'POST', corpo: { username: nuovaEmail, password: 'password123' } })
  token = l.token
  utenteNormale = await chiama('/api/user/me')
  ok('login utente', `${utenteNormale.nome}, ruoli: ${utenteNormale.ruoli.join(',')}`)
} catch (e) { ko('login utente', e) }

// 5. generi da autenticato (da anonimo e' 401: e' il motivo per cui il filtro
//    compare solo dopo il login)
try {
  const g = await chiama('/api/generi/allGeneri')
  ok('generi autenticato', `${g.length} generi`)
  const perGenere = await chiama(`/api/book/search?genereId=${g[0].id}&page=0&size=5`, { method: 'POST' })
  ok(`filtro genere "${g[0].nome}"`, `${perGenere.totalElements} titoli`)
} catch (e) { ko('generi', e) }

// 6. un utente normale NON deve poter aprire un prestito
try {
  await chiama('/api/prestiti/NewPrestito', { method: 'POST', corpo: { userId: utenteNormale.id, libroId: '00000000-0000-0000-0000-000000000000', durata: 'MEDIA' } })
  passi.push('  FAIL utente normale ha aperto un prestito (non doveva)')
} catch (e) {
  if (e.message.startsWith('403')) ok('utente normale bloccato su NewPrestito', '403 come atteso')
  else ko('NewPrestito da utente normale', e)
}

// 7. login operatore e prestito vero
try {
  const l = await chiama('/api/user/login', { method: 'POST', corpo: { username: 'superuser@biblioteca.it', password: 'changeme' } })
  token = l.token
  const io = await chiama('/api/user/me')
  const catalogo = await chiama('/api/book/all?page=0&size=1')
  const libro = catalogo.content[0]
  const prima = libro.copieDisponibili

  const prestito = await chiama('/api/prestiti/NewPrestito', { method: 'POST', corpo: { userId: io.id, libroId: libro.id, durata: 'MEDIA' } })
  ok('prestito aperto', `"${libro.titolo}" fino al ${prestito.dataRiconsegnaPrevista}`)

  const dopo = (await chiama('/api/book/all?page=0&size=1')).content[0].copieDisponibili
  if (dopo === prima - 1) ok('copie scalate', `${prima} -> ${dopo}`)
  else passi.push(`  FAIL copie non scalate: ${prima} -> ${dopo}`)

  const miei = await chiama('/api/prestiti/UserPrestiti')
  ok('UserPrestiti', `${miei.totalElements} prestiti`)

  await chiama('/api/prestiti/ClosePrestito', { method: 'PATCH', corpo: { idPrestito: prestito.id } })
  ok('prestito chiuso')
} catch (e) { ko('flusso prestito', e) }

console.log(passi.join('\n'))
const falliti = passi.filter((p) => p.includes('FAIL')).length
console.log(`\n${passi.filter((p) => p.includes('OK')).length} ok, ${falliti} falliti`)
process.exit(falliti ? 1 : 0)
