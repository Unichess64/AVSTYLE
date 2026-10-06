// tests/dominio/niente-dettagli-nei-log.test.ts
//
// §4.9: «nei log solo `code` ed `id`, mai `details` o `hint`». Un vincolo come
// `client_birthday_real` porterebbe nel log la riga rifiutata, cioè nome e
// compleanno di una cliente.
//
// Scritta come ELENCO DI PERMESSI, come le altre prove statiche: ogni
// `console.…(` sotto `src/` può portare SOLO un testo fisso e un oggetto con le
// chiavi ammesse qui sotto. Un elenco di divieti (`details`, `hint`) lascerebbe
// passare `console.error(e)`, `{ errore: e }` e `{ ...e }`, che li portano tutti.
//
// ⚠︎ Limite dichiarato: è una scansione di testo. Perde un oggetto costruito in
// una variabile e passato per nome; per questo un argomento che non sia un
// letterale è già una colpa.
import { readFileSync, readdirSync, statSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

function sorgenti(cartella = new globalThis.URL('../../src', import.meta.url).pathname): string[] {
  return readdirSync(cartella).flatMap((nome) => {
    const percorso = join(cartella, nome)
    if (statSync(percorso).isDirectory()) return sorgenti(percorso)
    return /\.(ts|tsx)$/.test(percorso) ? [percorso] : []
  })
}

/** Le sole chiavi che un log può portare. Si cambia QUI quando il permesso cambia. */
const CHIAVI_AMMESSE = new Set(['code', 'id'])

/** Gli argomenti di ogni `console.metodo(…)`, con le parentesi bilanciate. */
function chiamateAlLog(testo: string): string[] {
  const trovate: string[] = []
  const re = /console\.\w+\(/g
  for (let m = re.exec(testo); m !== null; m = re.exec(testo)) {
    let profondita = 1
    let i = m.index + m[0].length
    for (; i < testo.length && profondita > 0; i++) {
      if (testo[i] === '(') profondita++
      else if (testo[i] === ')') profondita--
    }
    trovate.push(testo.slice(m.index + m[0].length, i - 1))
  }
  return trovate
}

/** `true` se gli argomenti sono un testo fisso e, al più, un oggetto con le sole chiavi ammesse. */
export function logAmmesso(argomenti: string): boolean {
  const m = /^\s*(['"])(?:(?!\1)[^\\\n]|\\.)*\1\s*(?:,\s*\{([^{}]*)\}\s*)?,?\s*$/.exec(argomenti)
  if (m === null) return false
  if (m[2] === undefined) return true
  return m[2]
    .split(',')
    .map((x) => x.trim())
    .filter((x) => x !== '')
    .every((voce) => {
      const chiave = /^(\w+)\s*(?::|$)/.exec(voce)
      return chiave !== null && CHIAVI_AMMESSE.has(chiave[1])
    })
}

describe('§4.9: nei log solo code e id', () => {
  it('ogni console.… sotto src/ porta solo un testo fisso e le chiavi ammesse', () => {
    const file = sorgenti()
    expect(file.length).toBeGreaterThan(0)
    const chiamate = file.flatMap((f) => chiamateAlLog(readFileSync(f, 'utf8')).map((a) => ({ f, a })))
    // ⚠︎ senza questa, una scansione che non trova niente sarebbe verde
    expect(chiamate.length).toBeGreaterThan(0)
    expect(chiamate.filter(({ a }) => !logAmmesso(a)).map(({ f, a }) => `${f}: console(${a})`)).toEqual([])
  })

  it('la gemella positiva: la spia trova le forme colpevoli e lascia quelle ammesse', () => {
    expect(logAmmesso("'invio: guasto', { code: sqlstateDi(e) ?? 'nessuno', id }")).toBe(true)
    expect(logAmmesso("'avviso senza oggetto'")).toBe(true)
    expect(logAmmesso("'x', { code, details: e.details }")).toBe(false)
    expect(logAmmesso("'x', { code, hint }")).toBe(false)
    expect(logAmmesso("'x', e")).toBe(false)
    expect(logAmmesso('e')).toBe(false)
    expect(logAmmesso("'x', { ...e }")).toBe(false)
    expect(logAmmesso("`x ${e.message}`")).toBe(false)
  })
})
