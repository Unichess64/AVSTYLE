// La CSP di produzione ha `style-src 'self'` (src/server/csp.ts): un attributo
// `style` dal server funziona in `next dev`, che ha la deroga, e SPARISCE in
// `next start`. Il Task 3 lo ha pagato con `next/image`. Qui si presidia la
// forma, e il file che la sostituisce.
import { readFileSync, readdirSync, statSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

const SRC = new globalThis.URL('../../src', import.meta.url).pathname

function sorgenti(cartella = SRC): string[] {
  return readdirSync(cartella).flatMap((nome) => {
    const percorso = join(cartella, nome)
    if (statSync(percorso).isDirectory()) return sorgenti(percorso)
    return /\.tsx$/.test(percorso) ? [percorso] : []
  })
}

// Un attributo JSX `style=`, e `next/image`, che ne scrive uno da sé.
const sospetta = (riga: string) => /\sstyle=\{|\sstyle="|from ['"]next\/image['"]/.test(riga)

describe('nessuno stile in linea: la CSP di produzione lo blocca', () => {
  it('nessun componente scrive un attributo style', () => {
    const file = sorgenti()
    expect(file.length).toBeGreaterThan(0)
    const colpevoli = file.flatMap((f) =>
      readFileSync(f, 'utf8').split('\n').filter(sospetta).map((r) => `${f}: ${r.trim()}`))
    expect(colpevoli).toEqual([])
  })

  it('la gemella positiva: la spia trova le forme colpevoli', () => {
    expect(sospetta('<div style={{ top: 3 }}>')).toBe(true)
    expect(sospetta('<div style="top:3px">')).toBe(true)
    expect(sospetta("import Image from 'next/image'")).toBe(true)
    expect(sospetta('<div className={stile.blocco}>')).toBe(false)
  })

  it('griglia.module.css è quello che la sua regola genera', () => {
    const atteso: string[] = []
    for (let n = 1; n <= 289; n++) atteso.push(`.r${n}{grid-row-start:${n}}`)
    for (let n = 1; n <= 288; n++) atteso.push(`.h${n}{grid-row-end:span ${n}}`)
    for (let n = 1; n <= 12; n++) atteso.push(`.c${n}{grid-column-start:${n}}`)
    for (let n = 1; n <= 11; n++) atteso.push(`.w${n}{grid-column-end:span ${n}}`)
    const regole = readFileSync(join(SRC, 'cliente/griglia.module.css'), 'utf8')
      .split('\n')
      .filter((r) => r.startsWith('.'))
    expect(regole).toEqual(atteso)
  })
})
