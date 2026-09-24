// Promuove (o declassa) un utente ad Admin.
//
//   npm run promuovi -- --email mario@rossi.it
//   npm run promuovi -- --userId 3f2a... --revoca
//   npm run promuovi -- --elenca
//   npm run promuovi -- --api https://app-be.onrender.com --userId 3f2a... \
//                       --email-super x@y.it --password ...
//
// Perche' serve uno script: /api/role/grantAdmin vuole lo userId, ma il backend
// non espone nessun endpoint che elenchi gli utenti (UserController ha solo
// login, register, logout, refresh, me). L'unico modo di risalire all'id da
// un'email e' interrogare il database, e lo facciamo con psql.

import { execFileSync } from 'node:child_process'

function argomento(nome, predefinito) {
  const i = process.argv.indexOf(`--${nome}`)
  return i !== -1 && process.argv[i + 1] && !process.argv[i + 1].startsWith('--')
    ? process.argv[i + 1]
    : predefinito
}
const flag = (nome) => process.argv.includes(`--${nome}`)

const API = argomento('api', process.env.VITE_API_URL || 'http://localhost:8080').replace(/\/$/, '')
const EMAIL_SUPER = argomento('email-super', process.env.SUPERUSER_EMAIL || 'superuser@biblioteca.it')
const PASSWORD_SUPER = argomento('password', process.env.SUPERUSER_PASSWORD || 'changeme')
const DB = argomento('db', process.env.PGDATABASE || 'biblioteca')
const DB_USER = argomento('db-user', process.env.PGUSER || 'postgres')

function interrogaDb(sql) {
  try {
    return execFileSync('psql', ['-U', DB_USER, '-d', DB, '-tAc', sql], { encoding: 'utf8' }).trim()
  } catch (errore) {
    throw new Error(
      `psql non raggiungibile (${errore.message.split('\n')[0]}).\n` +
        `  In locale: controlla che PostgreSQL sia acceso.\n` +
        `  Su Render: recupera l'id dalla dashboard del database e usa --userId.`,
    )
  }
}

function elencaUtenti() {
  const righe = interrogaDb(`
    SELECT u.id || ' | ' || rpad(u.email, 34) || ' | ' || coalesce(string_agg(r.ruolo, ','), 'nessuno')
    FROM users u
    LEFT JOIN ruoli_utenti ru ON ru.id_utente = u.id
    LEFT JOIN ruoli r ON r.id = ru.id_ruolo
    GROUP BY u.id, u.email
    ORDER BY u.email
  `)
  console.log('\nid                                   | email                              | ruoli')
  console.log('-'.repeat(92))
  console.log(righe || '(nessun utente)')
  console.log()
}

async function main() {
  if (flag('elenca')) return elencaUtenti()

  let userId = argomento('userId')
  const email = argomento('email')

  if (!userId && !email) {
    console.error('Serve --email oppure --userId. Per vedere chi c\'e\': npm run promuovi -- --elenca')
    process.exit(1)
  }

  if (!userId) {
    userId = interrogaDb(`SELECT id FROM users WHERE lower(email) = lower('${email.replace(/'/g, "''")}')`)
    if (!userId) {
      console.error(`Nessun utente con email ${email}. Deve prima registrarsi da /registrati.`)
      process.exit(1)
    }
  }

  // login come SuperUser: grantAdmin e' @PreAuthorize("hasRole('SuperUser')")
  const accesso = await fetch(`${API}/api/user/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: EMAIL_SUPER, password: PASSWORD_SUPER }),
  })
  if (!accesso.ok) {
    console.error(`Login SuperUser fallito (${accesso.status}). Controlla --email-super e --password.`)
    process.exit(1)
  }
  const { token } = await accesso.json()

  const revoca = flag('revoca')
  const risposta = await fetch(`${API}/api/role/${revoca ? 'revokeAdmin' : 'grantAdmin'}/${userId}`, {
    method: revoca ? 'DELETE' : 'POST',
    headers: { Authorization: `Bearer ${token}` },
  })

  if (!risposta.ok) {
    const testo = await risposta.text()
    if (risposta.status === 409) console.error('E\' gia\' Admin.')
    else if (risposta.status === 404) console.error('Utente non trovato, oppure non era Admin.')
    else console.error(`Fallito: ${risposta.status} ${testo}`)
    process.exit(1)
  }

  console.log(`\n${revoca ? 'Revocato' : 'Promosso'}: ${email || userId}`)
  // I ruoli viaggiano dentro il JWT, quindi RuoloService revoca i token attivi.
  console.log('L\'utente deve rifare il login: i suoi token sono stati revocati')
  console.log('(i ruoli stanno dentro il JWT, quindi quello vecchio non vale piu\').\n')
}

main().catch((errore) => {
  console.error(`\n${errore.message}\n`)
  process.exit(1)
})
