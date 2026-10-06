// tests/dominio/niente-dati-negli-url.test.ts
//
// §4.8: nessun dato personale in un URL, né nell'indirizzo della pagina né
// nella querystring verso PostgREST. Scritta come ELENCO DI PERMESSI: un elenco
// di colonne vietate si apre da sé su ogni colonna che qualcuno aggiunge dopo
// (la revisione 1 della spec 3b ometteva `preferred_operator_id` e
// `no_messages`).
//
// ⚠︎ Limite dichiarato: è una scansione di testo, non un analizzatore
// sintattico. Perde un filtro con la colonna in una variabile e una catena
// spezzata su due istruzioni. È un presidio contro la distrazione; la difesa
// vera è che ogni filtro su dati delle clienti passa da una funzione in POST.
import { readFileSync, readdirSync, statSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

// Il percorso si risolve dal file della prova, non dalla cartella da cui si
// lancia: con `sorgenti('src')` un cwd diverso renderebbe la prova vuota e verde.
function sorgenti(cartella = new globalThis.URL('../../src', import.meta.url).pathname): string[] {
  return readdirSync(cartella).flatMap((nome) => {
    const percorso = join(cartella, nome)
    if (statSync(percorso).isDirectory()) return sorgenti(percorso)
    return /\.(ts|tsx)$/.test(percorso) ? [percorso] : []
  })
}

// I metodi di PostgREST che mettono un VALORE nella querystring. `select`,
// `order`, `range`, `limit`, `single` e `maybeSingle` non ci sono: portano nomi
// di colonna o posizioni.
const FILTRI = ['eq', 'neq', 'gt', 'gte', 'lt', 'lte', 'like', 'ilike', 'is', 'in', 'contains',
  'containedBy', 'overlaps', 'match', 'filter', 'not']

// ⚠︎ L'ELENCO DEI PERMESSI, ed è l'unica riga che si cambia quando il permesso
// cambia. Non c'è nessun elenco di colonne vietate, da nessuna parte.
// `client.id` è `gen_random_uuid()` (0003_client.sql:15): uno pseudonimo
// casuale, come gli id che §4.9 lascia in localStorage.
const COLONNE_AMMESSE_SU_CLIENT = new Set(['id'])

// Le spie, definite UNA VOLTA e usate dalle prove e dalla gemella: una gemella
// con una copia inline resterebbe verde mutando la spia vera.

/** Le coppie `.metodo('colonna'` di una catena su `from('client')` che non sono permesse. */
function filtriSuClient(catena: string): string[] {
  return [...catena.matchAll(/\.(\w+)\(\s*['"]([\w.]+)['"]/g)]
    .filter(([, metodo, colonna]) => FILTRI.includes(metodo) && !COLONNE_AMMESSE_SU_CLIENT.has(colonna))
    .map(([, metodo, colonna]) => `.${metodo}('${colonna}')`)
}

/** Ogni `from('client')` del testo, fino alla prima riga vuota. */
function catenaSuClient(testo: string): string[] {
  return [...testo.matchAll(/\.from\(\s*['"]client['"]\s*\)([\s\S]*?)(?=\n\s*\n|$)/g)].flatMap((m) =>
    filtriSuClient(m[1]),
  )
}

/** Un filtro su `….client.colonna` dentro una risorsa annidata. */
function filtriAnnidati(testo: string): string[] {
  return [...testo.matchAll(/\.(\w+)\(\s*['"]([\w.]*client\.[\w.]+)['"]/g)]
    .filter(([, metodo, percorso]) =>
      FILTRI.includes(metodo) && !COLONNE_AMMESSE_SU_CLIENT.has(percorso.split('.').pop()!))
    .map(([, metodo, percorso]) => `.${metodo}('${percorso}')`)
}

/** `.or()`, `.textSearch()`, rpc in GET, head, e un filtro concatenato dopo `.rpc(...)`. */
function formeVietate(testo: string): string[] {
  const trovate: string[] = []
  for (const forma of [/\.or\(/, /\.textSearch\(/, /get:\s*true/, /head:\s*true/]) {
    if (forma.test(testo)) trovate.push(forma.source)
  }
  for (const c of testo.matchAll(/\.rpc\([^)]*\)\s*\.(\w+)\(/g)) {
    if (FILTRI.includes(c[1])) trovate.push(`.${c[1]}() dopo .rpc()`)
  }
  return trovate
}

const PERSONALI = /full_name|phone|birth_month|birth_day|preferred_operator|no_messages|cliente(Nome|Telefono)/

/** Una riga che scrive nell'indirizzo della pagina un dato di una cliente. */
const nellIndirizzo = (riga: string) =>
  /searchParams\.set|router\.(push|replace)|URLSearchParams/.test(riga) && PERSONALI.test(riga)

describe('§4.8: nessun dato personale in un URL', () => {
  it('trova almeno un sorgente: altrimenti la prova è vuota e verde', () => {
    expect(sorgenti().length).toBeGreaterThan(0)
    // e trova la lettura del giorno, che è il primo lettore di nomi di clienti
    expect(sorgenti().some((f) => f.endsWith('src/server/lettura-giorno.ts'))).toBe(true)
  })

  it('su from(\'client\') è ammesso SOLO il filtro su id', () => {
    const colpevoli = sorgenti().flatMap((f) => catenaSuClient(readFileSync(f, 'utf8')).map((c) => `${f}: ${c}`))
    expect(colpevoli).toEqual([])
  })

  it('nessun filtro su una colonna di client dentro una risorsa annidata', () => {
    // §4.8 lo nomina: `client.full_name` in una lettura di `visit`.
    const colpevoli = sorgenti().flatMap((f) => filtriAnnidati(readFileSync(f, 'utf8')).map((c) => `${f}: ${c}`))
    expect(colpevoli).toEqual([])
  })

  it('niente .or(), .textSearch(), rpc in GET, head, né filtri dopo .rpc()', () => {
    const colpevoli = sorgenti().flatMap((f) => formeVietate(readFileSync(f, 'utf8')).map((c) => `${f}: ${c}`))
    expect(colpevoli).toEqual([])
  })

  it('nessun dato di una cliente finisce nell indirizzo della pagina', () => {
    // Nell'idioma dell'App Router una casella di ricerca scrive nell'indirizzo
    // PER DIFETTO, e quello è un nome nei log della piattaforma e nella
    // cronologia del telefono.
    const colpevoli = sorgenti().flatMap((f) =>
      readFileSync(f, 'utf8').split('\n').filter(nellIndirizzo).map((r) => `${f}: ${r.trim()}`))
    expect(colpevoli).toEqual([])
  })

  it('la gemella positiva: le spie riconoscono le forme colpevoli e lasciano passare quelle ammesse', () => {
    // Senza questa, tutte le prove di sopra restano verdi anche con spie che
    // non riconoscono niente. È la lezione «censimento con spia».
    expect(catenaSuClient(".from('client').eq('full_name', nome)")).toHaveLength(1)
    expect(catenaSuClient(".from('client').select('id').eq('phone', telefono)")).toHaveLength(1)
    // ⚠︎ order e range NON sono filtri, e id è permesso
    expect(catenaSuClient(".from('client').eq('id', clienteId).order('full_name').range(0, 19)")).toHaveLength(0)

    expect(filtriAnnidati(".eq('visit.client.full_name', nome)")).toHaveLength(1)
    expect(filtriAnnidati(".eq('visit.client.id', clienteId)")).toHaveLength(0)

    expect(formeVietate(".or('full_name.eq.x')")).toHaveLength(1)
    expect(formeVietate(".rpc('cerca_clienti', { p: x }).eq('id', y)")).toHaveLength(1)
    expect(formeVietate(".rpc('cerca_clienti', { p: x })")).toHaveLength(0)

    expect(nellIndirizzo('router.push(`/clienti?nome=${clienteNome}`)')).toBe(true)
    expect(nellIndirizzo('router.push(`/agenda?giorno=${data}`)')).toBe(false)
  })
})
