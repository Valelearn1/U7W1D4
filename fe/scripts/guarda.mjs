// Fotografa le pagine principali, per controllarle senza cliccare a mano.
//
//   npm run guarda                 chiaro
//   npm run guarda -- --tema scuro
//
// Le immagini finiscono in fe/schermate/.

import { mkdir } from 'node:fs/promises'
import { apri } from './browser.mjs'

const arg = (n, d) => {
  const i = process.argv.indexOf(`--${n}`)
  return i !== -1 && process.argv[i + 1] ? process.argv[i + 1] : d
}

const API = arg('api', 'http://localhost:8080')
const SITO = arg('sito', 'http://localhost:5173')
const TEMA = arg('tema', 'chiaro')
const CARTELLA = 'schermate'

async function entra(email, password) {
  const r = await fetch(`${API}/api/user/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: email, password }),
  })
  if (!r.ok) return null
  return (await r.json()).token
}

await mkdir(CARTELLA, { recursive: true })

const operatore = await entra(
  arg('admin', 'bibliotecario@incipit.it'),
  arg('admin-password', 'password123'),
)

const b = await apri({ larghezza: 1440, altezza: 1100 })

const PAGINE = [
  { nome: '1-home', url: '/', token: null },
  { nome: '2-catalogo', url: '/catalogo', token: null, attendi: () => document.querySelectorAll('article').length > 0 },
  { nome: '3-da-leggere', url: '/da-leggere', token: null },
  { nome: '4-accedi', url: '/accedi', token: null },
  { nome: '5-banco', url: '/banco', token: operatore },
  { nome: '6-prestiti', url: '/prestiti', token: operatore },
  { nome: '7-profilo', url: '/profilo', token: operatore, attendi: () => /tessera/i.test(document.body.innerText) },
  { nome: '8-gestione', url: '/amministrazione', token: operatore },
]

for (const p of PAGINE) {
  await b.vai(`${SITO}/`)
  await b.valuta((t, tema) => {
    if (t) localStorage.setItem('incipit-token', t)
    else localStorage.removeItem('incipit-token')
    localStorage.setItem('incipit-tema', tema)
  }, p.token, TEMA)

  await b.vai(`${SITO}${p.url}`)
  if (p.attendi) {
    try { await b.aspetta(p.attendi, { timeout: 12000 }) } catch { console.error(`  ! ${p.nome}: contenuto non comparso`) }
  }
  // lascia finire le animazioni d'ingresso e le copertine sopra la piega
  await new Promise((r) => setTimeout(r, 2600))

  const file = `${CARTELLA}/${TEMA}-${p.nome}.png`
  await b.scatta(file)
  console.log(`  ${file}`)
}

await b.chiudi()
console.log(`\nFatto. ${PAGINE.length} schermate in ${CARTELLA}/`)
