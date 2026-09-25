// Pilota minimo per Chrome, via Chrome DevTools Protocol.
//
// Serve per guardare l'app davvero: navigare, aspettare, leggere il DOM,
// cliccare, fare screenshot. Node 22+ ha WebSocket globale, quindi non
// servono dipendenze.
//
// Uso come libreria:
//   import { apri } from './browser.mjs'
//   const b = await apri()
//   await b.vai('http://localhost:5173/catalogo')
//   await b.aspetta(() => document.querySelectorAll('article').length > 0)
//   await b.scatta('/tmp/x.png')
//   await b.chiudi()

import { spawn } from 'node:child_process'
import { setTimeout as dormi } from 'node:timers/promises'

const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'
const PORTA = 9222

async function attendiDevtools(tentativi = 40) {
  for (let i = 0; i < tentativi; i++) {
    try {
      const r = await fetch(`http://127.0.0.1:${PORTA}/json/version`)
      if (r.ok) return
    } catch {
      // non ancora pronto
    }
    await dormi(250)
  }
  throw new Error('Chrome non ha aperto la porta di debug')
}

export async function apri({ larghezza = 1440, altezza = 1000 } = {}) {
  const processo = spawn(
    CHROME,
    [
      '--headless=new',
      '--disable-gpu',
      '--no-first-run',
      '--no-default-browser-check',
      '--hide-scrollbars',
      `--remote-debugging-port=${PORTA}`,
      `--window-size=${larghezza},${altezza}`,
      '--user-data-dir=/tmp/incipit-chrome-profilo',
      'about:blank',
    ],
    { stdio: 'ignore', detached: false },
  )

  await attendiDevtools()

  const schede = await (await fetch(`http://127.0.0.1:${PORTA}/json`)).json()
  const scheda = schede.find((s) => s.type === 'page')
  const ws = new WebSocket(scheda.webSocketDebuggerUrl)
  await new Promise((ok, ko) => {
    ws.onopen = ok
    ws.onerror = () => ko(new Error('WebSocket non aperto'))
  })

  let id = 0
  const inAttesa = new Map()
  ws.onmessage = (ev) => {
    const m = JSON.parse(ev.data)
    if (m.id && inAttesa.has(m.id)) {
      const { ok, ko } = inAttesa.get(m.id)
      inAttesa.delete(m.id)
      m.error ? ko(new Error(m.error.message)) : ok(m.result)
    }
  }

  const invia = (method, params = {}) =>
    new Promise((ok, ko) => {
      const n = ++id
      inAttesa.set(n, { ok, ko })
      ws.send(JSON.stringify({ id: n, method, params }))
    })

  await invia('Page.enable')
  await invia('Runtime.enable')

  const valuta = async (fn, ...args) => {
    const sorgente = `(${fn.toString()})(${args.map((a) => JSON.stringify(a)).join(',')})`
    const r = await invia('Runtime.evaluate', {
      expression: sorgente,
      awaitPromise: true,
      returnByValue: true,
    })
    if (r.exceptionDetails) {
      throw new Error(r.exceptionDetails.exception?.description ?? 'errore nella pagina')
    }
    return r.result.value
  }

  return {
    invia,
    valuta,

    async vai(url) {
      await invia('Page.navigate', { url })
      // il load event non basta per una SPA: si aspetta il primo render
      await dormi(700)
    },

    // Ripete la condizione finche' non e' vera. `fn` gira DENTRO la pagina.
    async aspetta(fn, { timeout = 10000, passo = 200 } = {}) {
      const scadenza = Date.now() + timeout
      while (Date.now() < scadenza) {
        if (await valuta(fn)) return true
        await dormi(passo)
      }
      throw new Error(`condizione mai verificata: ${fn.toString().slice(0, 80)}`)
    },

    async scatta(percorso, { interaPagina = false } = {}) {
      const r = await invia('Page.captureScreenshot', {
        format: 'png',
        captureBeyondViewport: interaPagina,
      })
      const { writeFile } = await import('node:fs/promises')
      await writeFile(percorso, Buffer.from(r.data, 'base64'))
      return percorso
    },

    // Click reale: calcola il centro dell'elemento e manda gli eventi del mouse.
    async clicca(selettore) {
      const punto = await valuta((s) => {
        const el = document.querySelector(s)
        if (!el) return null
        el.scrollIntoView({ block: 'center' })
        const r = el.getBoundingClientRect()
        return { x: r.left + r.width / 2, y: r.top + r.height / 2 }
      }, selettore)
      if (!punto) throw new Error(`elemento non trovato: ${selettore}`)

      for (const type of ['mousePressed', 'mouseReleased']) {
        await invia('Input.dispatchMouseEvent', {
          type, x: punto.x, y: punto.y, button: 'left', clickCount: 1,
        })
      }
      await dormi(250)
    },

    async scrivi(selettore, testo) {
      await valuta((s, t) => {
        const el = document.querySelector(s)
        const setter = Object.getOwnPropertyDescriptor(
          el instanceof HTMLTextAreaElement ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype,
          'value',
        ).set
        setter.call(el, t)
        el.dispatchEvent(new Event('input', { bubbles: true }))
      }, selettore, testo)
      await dormi(150)
    },

    // Gli errori di console sono spesso l'unico indizio di un render fallito.
    async errori() {
      return valuta(() => window.__erroriRaccolti ?? [])
    },

    async chiudi() {
      try { ws.close() } catch {}
      try { processo.kill() } catch {}
    },
  }
}
