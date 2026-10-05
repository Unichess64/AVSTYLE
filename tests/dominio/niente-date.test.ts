import { readFileSync, readdirSync, statSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

// Il percorso si risolve dal file della prova, non dalla cartella da cui si
// lancia: con `sorgenti('src')` un cwd diverso rendeva la prova vuota e verde.
function sorgenti(cartella = new globalThis.URL('../../src', import.meta.url).pathname): string[] {
  return readdirSync(cartella).flatMap((nome) => {
    const percorso = join(cartella, nome)
    if (statSync(percorso).isDirectory()) return sorgenti(percorso)
    return /\.(ts|tsx)$/.test(percorso) ? [percorso] : []
  })
}

// La spia, definita UNA VOLTA e usata dalle due prove: nella prima stesura la
// gemella ne teneva una copia inline, quindi mutando la spia vera restava
// verde. Si cerca la FORMA, non il nome: `new Date(` con `versione` o
// `updated_at` sulla stessa riga. Un Date sull'orologio (`new Date()`) è
// legittimo.
const sospetta = (riga: string) =>
  /new Date\s*\(\s*[^)]/.test(riga) && /versione|updated_at/i.test(riga)

describe('C4: le versioni viaggiano come testo', () => {
  it('nessun sorgente costruisce un Date da una versione', () => {
    const file = sorgenti()
    expect(file.length).toBeGreaterThan(0)   // ⚠︎ senza questa, una cartella sbagliata rende la prova vuota e verde
    const colpevoli = file.flatMap((f) =>
      readFileSync(f, 'utf8').split('\n').filter(sospetta).map((r) => `${f}: ${r.trim()}`))
    expect(colpevoli).toEqual([])
  })

  it('la gemella positiva: la spia trova una riga colpevole quando c è', () => {
    expect(sospetta('const x = new Date(stato.versione)')).toBe(true)
    expect(sospetta('const ora = new Date()')).toBe(false)   // e non morde dove non deve
  })
})
