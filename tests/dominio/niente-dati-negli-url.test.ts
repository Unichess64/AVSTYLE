// tests/dominio/niente-dati-negli-url.test.ts
//
// §4.8: nessun dato personale in un URL, né nell'indirizzo della pagina né
// nella querystring verso PostgREST. Scritta come ELENCO DI PERMESSI, sulle
// colonne E sui metodi: un elenco di divieti si apre da sé su ogni colonna che
// qualcuno aggiunge dopo (la revisione 1 della spec 3b ometteva
// `preferred_operator_id` e `no_messages`) e su ogni metodo che la libreria
// aggiunge dopo (la revisione del Task 5 ne ha contati quattordici che un
// elenco di filtri non conosceva: `ilikeAnyOf`, `regexMatch`, `isDistinct`…).
//
// ⚠︎ Limite dichiarato: è una scansione di testo, non un analizzatore
// sintattico. Perde una catena spezzata su due istruzioni (il builder messo in
// una variabile e filtrato dopo) e una stringa con parentesi sbilanciate dentro
// una catena. È un presidio contro la distrazione; la difesa vera è che ogni
// filtro su dati delle clienti passa da una funzione in POST.
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

// ⚠︎ I PERMESSI SUI METODI. Tutti quelli di postgrest-js 2.117 che non mettono
// un VALORE nella querystring: portano nomi di colonna, posizioni, opzioni, o
// mandano i valori nel corpo (insert, update, upsert, delete). Ogni altro
// metodo — compreso uno che una versione futura aggiungerà — è un filtro
// finché qualcuno non lo scrive qui.
const METODI_SENZA_VALORE = new Set([
  'select', 'order', 'range', 'limit', 'single', 'maybeSingle', 'csv', 'geojson', 'explain',
  'returns', 'overrideTypes', 'abortSignal', 'rollback', 'throwOnError', 'setHeader', 'retry',
  'stripNulls', 'maxAffected', 'insert', 'update', 'upsert', 'delete',
])

// ⚠︎ I PERMESSI SULLE COLONNE, ed è l'unica riga che si cambia quando il
// permesso cambia. `client.id` è `gen_random_uuid()` (0003_client.sql:15): uno
// pseudonimo casuale, come gli id che §4.9 lascia in localStorage.
const COLONNE_AMMESSE_SU_CLIENT = new Set(['id'])

// ⚠︎ I PERMESSI SULL'INDIRIZZO DELLA PAGINA: i soli parametri ammessi. La data
// sì (Vincoli globali), e l'operatrice della settimana (Task 6), che è un
// `operator.id` e non un dato di una cliente. Nient'altro.
const PARAMETRI_AMMESSI = new Set(['giorno', 'settimana', 'operatrice'])

interface Chiamata {
  readonly metodo: string
  readonly argomenti: string
}

/** Da `i` (subito dopo una `(`), l'indice della `)` che la chiude. */
function chiusa(testo: string, i: number): number {
  let profondita = 1
  for (; i < testo.length; i++) {
    if (testo[i] === '(') profondita++
    else if (testo[i] === ')' && --profondita === 0) return i
  }
  return testo.length
}

/**
 * La catena di chiamate che segue la posizione `da`: `.metodo(…)` uno dopo
 * l'altro, con le parentesi bilanciate e saltando spazi, a capo e commenti di
 * riga fra un anello e l'altro.
 */
function catenaDa(testo: string, da: number): Chiamata[] {
  const anelli: Chiamata[] = []
  let i = da
  for (;;) {
    const resto = /^(?:\s|\/\/[^\n]*)*\.(\w+)\(/.exec(testo.slice(i))
    if (resto === null) return anelli
    const apre = i + resto[0].length
    const fine = chiusa(testo, apre)
    anelli.push({ metodo: resto[1], argomenti: testo.slice(apre, fine) })
    i = fine + 1
  }
}

/** Le colonne che una chiamata filtra: il primo argomento letterale, o le chiavi di `match({…})`. */
function colonneDi(c: Chiamata): string[] | null {
  const letterale = /^\s*['"`]([\w.!]+)['"`]/.exec(c.argomenti)
  if (letterale) return [letterale[1]]
  const oggetto = /^\s*\{([\s\S]*)\}\s*$/.exec(c.argomenti)
  if (oggetto) {
    return oggetto[1]
      .split(',')
      .map((p) => p.split(':')[0].trim().replace(/^['"`]|['"`]$/g, ''))
      .filter((k) => k.length > 0)
  }
  return null   // una colonna in una variabile: non si può dimostrare ammessa
}

const ultima = (percorso: string) => percorso.split('.').pop()!

/** Un anello colpevole su `from('client')`: un metodo non ammesso su una colonna che non sia `id`. */
function anelloColpevoleSuClient(c: Chiamata): boolean {
  if (METODI_SENZA_VALORE.has(c.metodo)) return false
  const colonne = colonneDi(c)
  return colonne === null || colonne.some((k) => !COLONNE_AMMESSE_SU_CLIENT.has(ultima(k)))
}

// Le spie, definite UNA VOLTA e usate dalle prove e dalla gemella: una gemella
// con una copia inline resterebbe verde mutando la spia vera.

/** Ogni anello colpevole di ogni catena che parte da `from('client')`. */
function catenaSuClient(testo: string): string[] {
  return [...testo.matchAll(/\.from\(\s*['"`]client['"`]\s*\)/g)].flatMap((m) =>
    catenaDa(testo, m.index! + m[0].length)
      .filter(anelloColpevoleSuClient)
      .map((c) => `.${c.metodo}(${c.argomenti})`),
  )
}

/** Un filtro su `….client.colonna` dentro una risorsa annidata, in qualunque catena. */
function filtriAnnidati(testo: string): string[] {
  const colpevoli: string[] = []
  for (const m of testo.matchAll(/\.(\w+)\(/g)) {
    if (METODI_SENZA_VALORE.has(m[1])) continue
    const apre = m.index! + m[0].length
    const c = { metodo: m[1], argomenti: testo.slice(apre, chiusa(testo, apre)) }
    const colonne = colonneDi(c) ?? []
    const suClient = colonne.filter((k) => /(^|\.)client[\w!]*\./.test(k))
    if (suClient.some((k) => !COLONNE_AMMESSE_SU_CLIENT.has(ultima(k)))) {
      colpevoli.push(`.${c.metodo}(${c.argomenti})`)
    }
  }
  return colpevoli
}

/** `.or()`, `.textSearch()`, rpc in GET, head, e un filtro OVUNQUE nella catena di `.rpc(...)`. */
function formeVietate(testo: string): string[] {
  const trovate: string[] = []
  for (const forma of [/\.or\(/, /\.textSearch\(/, /get:\s*true/, /head:\s*true/]) {
    if (forma.test(testo)) trovate.push(forma.source)
  }
  // Un filtro dopo `.rpc(...)` finisce nella querystring, anche dopo un
  // `.select()`: si legge tutta la catena, non solo il primo anello.
  for (const m of testo.matchAll(/\.rpc\(/g)) {
    const apre = m.index! + m[0].length
    for (const c of catenaDa(testo, chiusa(testo, apre) + 1)) {
      if (!METODI_SENZA_VALORE.has(c.metodo)) trovate.push(`.${c.metodo}() dopo .rpc()`)
    }
  }
  return trovate
}

const PERSONALI = /full_name|phone|birth_month|birth_day|preferred_operator|no_messages|cliente(Nome|Telefono)|telefono/i

/** I punti da cui un valore raggiunge l'indirizzo della pagina. */
const VERSO_INDIRIZZO =
  /searchParams\.(set|append)|router\.(push|replace|prefetch)|URLSearchParams|href=|redirect\(|location\.|location\s*=/

/** Una riga che porta un dato di una cliente verso l'indirizzo della pagina. */
const nellIndirizzo = (riga: string) => VERSO_INDIRIZZO.test(riga) && PERSONALI.test(riga)

/** I parametri di querystring che il testo scrive, in ogni forma: `?x=`, `&x=`, `set('x'`, `{ x: … }` di URLSearchParams. */
function parametriNonAmmessi(testo: string): string[] {
  const nomi = [
    ...[...testo.matchAll(/[?&](\w+)=/g)].map((m) => m[1]),
    ...[...testo.matchAll(/searchParams\.(?:set|append)\(\s*['"`](\w+)/g)].map((m) => m[1]),
    ...[...testo.matchAll(/new URLSearchParams\(\s*\{([^}]*)\}/g)].flatMap((m) =>
      m[1].split(',').map((p) => p.split(':')[0].trim()).filter((k) => k.length > 0)),
  ]
  return nomi.filter((n) => !PARAMETRI_AMMESSI.has(n))
}

/** Un modulo in GET mette i suoi campi nell'indirizzo. */
const moduloInGet = (testo: string) =>
  [...testo.matchAll(/<form\b[^>]*>/g)].filter((m) => /method=["'{]*get|action=["'][^"']*["']/i.test(m[0])).map((m) => m[0])

describe('§4.8: nessun dato personale in un URL', () => {
  it('trova almeno un sorgente: altrimenti la prova è vuota e verde', () => {
    expect(sorgenti().length).toBeGreaterThan(0)
    // e trova la lettura del giorno, che è il primo lettore di nomi di clienti
    expect(sorgenti().some((f) => f.endsWith('src/server/lettura-giorno.ts'))).toBe(true)
  })

  it('su from(\'client\') è ammesso SOLO un filtro su id', () => {
    const colpevoli = sorgenti().flatMap((f) => catenaSuClient(readFileSync(f, 'utf8')).map((c) => `${f}: ${c}`))
    expect(colpevoli).toEqual([])
  })

  it('nessun filtro su una colonna di client dentro una risorsa annidata', () => {
    // §4.8 lo nomina: `client.full_name` in una lettura di `visit`.
    const colpevoli = sorgenti().flatMap((f) => filtriAnnidati(readFileSync(f, 'utf8')).map((c) => `${f}: ${c}`))
    expect(colpevoli).toEqual([])
  })

  it('niente .or(), .textSearch(), rpc in GET, head, né filtri nella catena di .rpc()', () => {
    const colpevoli = sorgenti().flatMap((f) => formeVietate(readFileSync(f, 'utf8')).map((c) => `${f}: ${c}`))
    expect(colpevoli).toEqual([])
  })

  it('nessun dato di una cliente finisce nell indirizzo della pagina', () => {
    // Nell'idioma dell'App Router una casella di ricerca scrive nell'indirizzo
    // PER DIFETTO, e quello è un nome nei log della piattaforma e nella
    // cronologia del telefono.
    const colpevoli = sorgenti().flatMap((f) => {
      const testo = readFileSync(f, 'utf8')
      return [
        ...testo.split('\n').filter(nellIndirizzo).map((r) => r.trim()),
        ...parametriNonAmmessi(testo).map((n) => `parametro ?${n}=`),
        ...moduloInGet(testo),
      ].map((c) => `${f}: ${c}`)
    })
    expect(colpevoli).toEqual([])
  })

  it('la gemella positiva: le spie riconoscono le forme colpevoli e lasciano passare quelle ammesse', () => {
    // Senza questa, tutte le prove di sopra restano verdi anche con spie che
    // non riconoscono niente. È la lezione «censimento con spia».
    const suClient = (s: string) => catenaSuClient(s).length
    expect(suClient(".from('client').eq('full_name', nome)")).toBe(1)
    expect(suClient(".from('client').select('id').eq('phone', telefono)")).toBe(1)
    // i metodi che un elenco di filtri non conosceva (revisione del Task 5)
    expect(suClient(".from('client').select('id').ilikeAnyOf('full_name', [nome])")).toBe(1)
    expect(suClient(".from('client').select('id').regexMatch('phone', t)")).toBe(1)
    expect(suClient(".from('client').select('id').match({ full_name: nome })")).toBe(1)
    expect(suClient(".from('client').select('id').match({ full_name })")).toBe(1)
    expect(suClient(".from('client').select('id').eq(colonna, valore)")).toBe(1)   // non dimostrabile
    expect(suClient(".from('client')\n  .select('id')   // commento\n  .eq('phone', t)")).toBe(1)
    // ⚠︎ order e range NON sono filtri, e id è permesso
    expect(suClient(".from('client').eq('id', clienteId).order('full_name').range(0, 19)")).toBe(0)
    expect(suClient(".from('client').select('id').match({ id: clienteId })")).toBe(0)
    expect(suClient(".from('client').update({ full_name: nome }).eq('id', clienteId)")).toBe(0)

    expect(filtriAnnidati(".eq('visit.client.full_name', nome)")).toHaveLength(1)
    expect(filtriAnnidati(".regexMatch('client.phone', t)")).toHaveLength(1)
    expect(filtriAnnidati(".match({ 'visit.client.phone': t })")).toHaveLength(1)
    expect(filtriAnnidati(".eq('visit.client.id', clienteId)")).toHaveLength(0)
    expect(filtriAnnidati(".select('visit:visit_id ( client:client_id ( id, full_name ) )')")).toHaveLength(0)
    expect(filtriAnnidati(".order('client.full_name')")).toHaveLength(0)

    expect(formeVietate(".or('full_name.eq.x')")).toHaveLength(1)
    expect(formeVietate(".rpc('cerca_clienti', { p: x }).eq('id', y)")).toHaveLength(1)
    expect(formeVietate(".rpc('cerca_clienti', { p: f(x) }).select('id').eq('full_name', y)")).toHaveLength(1)
    expect(formeVietate(".rpc('cerca_clienti', { p: x })\n  .select('id')\n  .ilikeAnyOf('full_name', [y])")).toHaveLength(1)
    expect(formeVietate(".rpc('cerca_clienti', { p: ids.map((o) => o.id) }).single()")).toHaveLength(0)

    expect(nellIndirizzo('router.push(`/clienti?nome=${clienteNome}`)')).toBe(true)
    expect(nellIndirizzo('<Link href={`/clienti/${clienteNome}`}>')).toBe(true)
    expect(nellIndirizzo("redirect('/clienti?t=' + telefono)")).toBe(true)
    expect(nellIndirizzo('window.location.href = `/x/${c.full_name}`')).toBe(true)
    expect(nellIndirizzo('router.push(`/agenda?giorno=${data}`)')).toBe(false)
    expect(parametriNonAmmessi('`/clienti?nome=${n}`')).toEqual(['nome'])
    expect(parametriNonAmmessi("p.searchParams.set('q', testo)")).toEqual(['q'])
    expect(parametriNonAmmessi('new URLSearchParams({ q: testo })')).toEqual(['q'])
    expect(parametriNonAmmessi('`/agenda?giorno=${data}`')).toEqual([])
    expect(parametriNonAmmessi('`/agenda?giorno=${data}&settimana=${id}`')).toEqual([])
    expect(parametriNonAmmessi('`/agenda?giorno=${data}&cliente=${id}`')).toEqual(['cliente'])
    expect(moduloInGet('<form method="get" action="/clienti">')).toHaveLength(1)
    expect(moduloInGet('<form action={esci}>')).toHaveLength(0)
  })
})
