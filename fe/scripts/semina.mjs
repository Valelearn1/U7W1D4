// Riempie il catalogo con generi e libri di prova.
//
//   node scripts/semina.mjs
//   node scripts/semina.mjs --api https://app-be.onrender.com --email x@y.it --password ...
//
// Usa solo le API pubbliche del backend, quindi funziona identico in locale e
// su Render. Non tocca il database direttamente e non modifica il codice del BE.
//
// Gli ISBN sono reali e verificati su Open Library: le copertine si vedono.

import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const QUI = dirname(fileURLToPath(import.meta.url))

function argomento(nome, predefinito) {
  const i = process.argv.indexOf(`--${nome}`)
  return i !== -1 && process.argv[i + 1] ? process.argv[i + 1] : predefinito
}

const API = argomento('api', process.env.VITE_API_URL || 'http://localhost:8080').replace(/\/$/, '')
const EMAIL = argomento('email', process.env.SUPERUSER_EMAIL || 'superuser@biblioteca.it')
const PASSWORD = argomento('password', process.env.SUPERUSER_PASSWORD || 'changeme')

let token = null

async function chiama(percorso, opzioni = {}) {
  const { corpo, ...resto } = opzioni
  const intestazioni = {}
  if (corpo !== undefined) intestazioni['Content-Type'] = 'application/json'
  if (token) intestazioni.Authorization = `Bearer ${token}`

  const risposta = await fetch(`${API}${percorso}`, {
    ...resto,
    headers: intestazioni,
    body: corpo !== undefined ? JSON.stringify(corpo) : undefined,
  })

  const testo = await risposta.text()
  if (!risposta.ok) {
    const err = new Error(testo || `${risposta.status} ${risposta.statusText}`)
    err.stato = risposta.status
    throw err
  }
  return testo ? JSON.parse(testo) : undefined
}

async function main() {
  console.log(`API: ${API}`)

  // 1. login come SuperUser: creare generi e libri richiede Admin/SuperUser
  const accesso = await chiama('/api/user/login', {
    method: 'POST',
    corpo: { username: EMAIL, password: PASSWORD },
  })
  token = accesso.token
  console.log(`Autenticato come ${EMAIL}`)

  const libri = JSON.parse(readFileSync(join(QUI, 'libri.json'), 'utf8'))

  // 2. generi: si creano solo quelli che mancano, cosi' rilanciare lo script
  //    non produce duplicati ne' errori
  const esistenti = await chiama('/api/generi/allGeneri')
  const perNome = new Map(esistenti.map((g) => [g.nome.toLowerCase(), g]))

  const richiesti = [...new Set(libri.map((l) => l.genere))]
  for (const nome of richiesti) {
    if (perNome.has(nome.toLowerCase())) continue
    const creato = await chiama('/api/generi/newGenere', { method: 'POST', corpo: { nome } })
    perNome.set(nome.toLowerCase(), creato)
    console.log(`  genere   + ${nome}`)
  }
  console.log(`Generi: ${perNome.size}`)

  // 3. libri. Il backend risponde 201 se l'ISBN e' nuovo e 200 se esisteva
  //    (in quel caso somma le copie), quindi rilanciare lo script non rompe
  //    nulla: aggiunge copie.
  let nuovi = 0
  let falliti = 0

  for (const libro of libri) {
    const genere = perNome.get(libro.genere.toLowerCase())
    try {
      await chiama('/api/book/newLibro', {
        method: 'POST',
        corpo: {
          isbn: libro.isbn,
          titolo: libro.titolo,
          autore: libro.autore,
          edizione: null,
          casaEditrice: libro.casaEditrice,
          prezzo: libro.prezzo,
          annoDiUscita: libro.annoDiUscita,
          copie: libro.copie,
          copertinaRigida: libro.copertinaRigida,
          genereId: genere.id,
          path: libro.path ?? null,
        },
      })
      nuovi++
      console.log(`  libro    + ${libro.titolo}`)
    } catch (errore) {
      falliti++
      console.error(`  libro    ! ${libro.titolo}: ${errore.message}`)
    }
  }

  const catalogo = await chiama('/api/book/all?size=1')
  console.log(`\nFatto. ${nuovi} inseriti, ${falliti} falliti. In catalogo: ${catalogo.totalElements} titoli.`)
}

main().catch((errore) => {
  console.error(`\nSeed interrotto: ${errore.message}`)
  process.exit(1)
})
