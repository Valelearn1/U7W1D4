// Crea gli account di prova per la presentazione: uno per ogni ruolo.
//
//   npm run utenti
//   npm run utenti -- --api https://app-be.onrender.com --password-super <...>
//
// Il SuperUser non si crea da qui: lo fa il DataInitializer all'avvio del
// backend leggendo SUPERUSER_EMAIL / SUPERUSER_PASSWORD.
// L'Admin non si registra: si registra come User e poi lo si promuove con
// POST /api/role/grantAdmin/{id}, che e' riservato al SuperUser.

import { execFileSync } from 'node:child_process'

function argomento(nome, predefinito) {
  const i = process.argv.indexOf(`--${nome}`)
  return i !== -1 && process.argv[i + 1] && !process.argv[i + 1].startsWith('--')
    ? process.argv[i + 1]
    : predefinito
}

const API = argomento('api', process.env.VITE_API_URL || 'http://localhost:8080').replace(/\/$/, '')
const EMAIL_SUPER = argomento('email-super', process.env.SUPERUSER_EMAIL || 'superuser@biblioteca.it')
const PASSWORD_SUPER = argomento('password-super', process.env.SUPERUSER_PASSWORD || 'changeme')
const DB = argomento('db', process.env.PGDATABASE || 'biblioteca')
const DB_USER = argomento('db-user', process.env.PGUSER || 'postgres')

const PASSWORD = 'password123'

const DEMO = [
  { email: 'lettore@incipit.it', nome: 'Lea', cognome: 'Lettore', ruolo: 'User',
    dataDiNascita: '1998-03-21', indirizzo: 'Via dei Tigli 4, Milano' },
  { email: 'bibliotecario@incipit.it', nome: 'Bruno', cognome: 'Bibliotecario', ruolo: 'Admin',
    dataDiNascita: '1985-11-08', indirizzo: 'Corso Garibaldi 17, Milano' },
]

async function chiama(percorso, opzioni = {}, token = null) {
  const { corpo, ...resto } = opzioni
  const h = {}
  if (corpo !== undefined) h['Content-Type'] = 'application/json'
  if (token) h.Authorization = `Bearer ${token}`
  const r = await fetch(`${API}${percorso}`, {
    ...resto,
    headers: h,
    body: corpo !== undefined ? JSON.stringify(corpo) : undefined,
  })
  const t = await r.text()
  if (!r.ok) {
    const e = new Error(t || `${r.status}`)
    e.stato = r.status
    throw e
  }
  return t ? JSON.parse(t) : undefined
}

function idDaEmail(email) {
  try {
    return execFileSync(
      'psql',
      ['-U', DB_USER, '-d', DB, '-tAc', `SELECT id FROM users WHERE lower(email)=lower('${email}')`],
      { encoding: 'utf8' },
    ).trim()
  } catch {
    return null
  }
}

async function main() {
  console.log(`API: ${API}\n`)

  for (const u of DEMO) {
    try {
      await chiama('/api/user/register', {
        method: 'POST',
        corpo: {
          email: u.email, password: PASSWORD, nome: u.nome, cognome: u.cognome,
          dataDiNascita: u.dataDiNascita, indirizzo: u.indirizzo,
        },
      })
      console.log(`  creato    ${u.email}`)
    } catch (e) {
      // 409 = esiste gia': va bene, lo script si rilancia senza danni
      if (e.stato === 409) console.log(`  esisteva  ${u.email}`)
      else { console.error(`  errore    ${u.email}: ${e.message}`); continue }
    }
  }

  // Promozione ad Admin: serve il SuperUser
  const daPromuovere = DEMO.filter((u) => u.ruolo === 'Admin')
  if (daPromuovere.length) {
    const { token } = await chiama('/api/user/login', {
      method: 'POST',
      corpo: { username: EMAIL_SUPER, password: PASSWORD_SUPER },
    })

    for (const u of daPromuovere) {
      const id = idDaEmail(u.email)
      if (!id) {
        console.error(`  ! ${u.email}: id non recuperabile (psql non raggiungibile).`)
        console.error(`    Su Render passa l'id a mano: npm run promuovi -- --userId <id>`)
        continue
      }
      try {
        await chiama(`/api/role/grantAdmin/${id}`, { method: 'POST' }, token)
        console.log(`  promosso  ${u.email} -> Admin`)
      } catch (e) {
        if (e.stato === 409) console.log(`  gia' Admin ${u.email}`)
        else console.error(`  errore    ${u.email}: ${e.message}`)
      }
    }
  }

  console.log(`
Account per la demo:

  Ruolo       Email                        Password
  ---------------------------------------------------------
  User        lettore@incipit.it           ${PASSWORD}
  Admin       bibliotecario@incipit.it     ${PASSWORD}
  SuperUser   ${EMAIL_SUPER.padEnd(28)} ${PASSWORD_SUPER}
`)
}

main().catch((e) => {
  console.error(`\nInterrotto: ${e.message}\n`)
  process.exit(1)
})
