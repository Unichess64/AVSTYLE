// src/cliente/scheda-visita.tsx
'use client'
//
// La scheda visita (spec 3a §5.4, spec §9.4): una pagina intera sopra
// l'agenda, in lettura e in compilazione. «Salva», «Togli» ed «Elimina visita»
// chiamano le `azioni`, cioè le Server Actions di `src/server/azioni-visita.ts`
// che la pagina passa (Task 8), e qui si legge la `Risposta`.
//
// Il codice d'invio nasce QUI, sul telefono, con `crypto.randomUUID()`: uno per
// invio, e il server lo tiene uguale per tutti i ritentativi su 40P01 (§4.4).
//
// La bozza vive SOLO in memoria (§4.9): stato di React, niente localStorage,
// niente indirizzo. Le regole stanno in `src/dominio/` (scheda, durate,
// avvisi, conflitti): qui si eseguono soltanto.
//
// ⚠︎ NIENTE attributi `style`: la CSP di produzione li blocca.
import { useEffect, useState } from 'react'
import type { Apertura } from '../dominio/apertura'
import type { Atteso } from '../dominio/attesi'
import { type Avviso, calcolaAvvisi, confermaAvvisi, fermaIlSalvataggio } from '../dominio/avvisi'
import { fraseDeiConflitti, idInScrittura, trovaConflitti } from '../dominio/conflitti'
import {
  type Catalogo,
  aggiungiServizio,
  cambiaDurata,
  cambiaInizio,
  cambiaOperatrice,
  cambiaServizio,
  serviziPerLaScelta,
} from '../dominio/durate'
import {
  type Scheda,
  type SchedaSerializzata,
  type ServizioInScheda,
  adottaStato,
  altreModifiche,
  apriSchedaSuVisita,
  apriSchedaVuota,
  bloccoDelSalva,
  cosaManca,
  operatriceScelta,
  serializza,
  telefonoDalModulo,
  togli,
} from '../dominio/scheda'
import { oraDaCella } from '../dominio/tempo'
import { dataReale } from '../dominio/validazione'
import type { DatiGiorno, RispostaApri } from '../server/lettura-scheda'
import type { Risposta } from '../server/scrittura-visita'
import { CercaCliente } from './cerca-cliente'
import { type RichiesteScheda, UscitaForzata, richiesteVere } from './richieste-scheda'
import stile from './scheda-visita.module.css'

/**
 * «Salva», «Togli» ed «Elimina visita»: le Server Actions di
 * `src/server/azioni-visita.ts`. Obbligatorie: una pagina che dimenticasse di
 * passarle non compila (le prove sul componente non vedono la pagina).
 */
export interface AzioniScheda {
  salva(scheda: SchedaSerializzata, codice: string): Promise<Risposta>
  togli(scheda: SchedaSerializzata, codice: string): Promise<Risposta>
  elimina(visitaId: string, versione: string, attesi: readonly Atteso[], codice: string): Promise<Risposta>
}

/** La scheda aggiornata di §4.4: le modifiche non inviate si perdono, e lo si dice. */
const SCHEDA_AGGIORNATA = 'La scheda aggiornata: questa visita è cambiata da un’altra parte, ecco com’è ora. Le modifiche non salvate vanno rifatte.'

function esci() {
  // L'account non è più un'operatrice attiva: si va all'accesso (§4.7).
  window.location.assign('/accesso')
}

type Caricamento =
  | { readonly tipo: 'carico' }
  | { readonly tipo: 'guasto' }
  | { readonly tipo: 'assente' }
  | { readonly tipo: 'pronta'; readonly dati: RispostaApri; readonly scheda: Scheda }

export function SchedaVisita({
  apertura,
  onChiudi,
  onFatto,
  onVaiA,
  richieste = richiesteVere,
  azioni,
}: {
  apertura: Apertura
  onChiudi: () => void
  /** Un invio con un esito definitivo (✓, o il giorno da ricaricare): la scheda si chiude, e il testo resta sull'agenda. */
  onFatto: (testo: string) => void
  /** «Vai lì» di spec §10.1: l'appuntamento in conflitto, e il suo giorno. */
  onVaiA: (appuntamentoId: string, data: string) => void
  richieste?: RichiesteScheda
  azioni: AzioniScheda
}) {
  const [caricamento, setCaricamento] = useState<Caricamento>({ tipo: 'carico' })
  const [tentativo, setTentativo] = useState(0)
  // §4.3 passo 6: 23503 su servizio od operatrice ricarica la scheda, e la frase resta.
  const [nota, setNota] = useState<string | null>(null)

  useEffect(() => {
    let viva = true
    setCaricamento({ tipo: 'carico' })
    richieste.apri(apertura.data, apertura.tipo === 'visita' ? apertura.visitaId : null).then(
      (dati) => {
        if (!viva) return
        if (apertura.tipo === 'vuota') {
          setCaricamento({ tipo: 'pronta', dati, scheda: apriSchedaVuota(apertura.data, apertura.operatriceId, apertura.inizio) })
        } else if (dati.stato === null) {
          setCaricamento({ tipo: 'assente' })
        } else {
          setCaricamento({ tipo: 'pronta', dati, scheda: apriSchedaSuVisita(dati.stato, apertura.visitaId) })
        }
      },
      (e) => {
        if (!viva) return
        if (e instanceof UscitaForzata) esci()
        else setCaricamento({ tipo: 'guasto' })
      },
    )
    return () => {
      viva = false
    }
  }, [apertura, richieste, tentativo])

  const titolo = apertura.tipo === 'vuota' ? 'Nuova visita' : 'Visita'
  return (
    <div className={stile.foglio} role="dialog" aria-modal="true" aria-label={titolo}>
      <header className={stile.testata}>
        <button type="button" className={stile.chiudi} onClick={onChiudi}>
          Chiudi
        </button>
        <h2 className={stile.titolo}>{titolo}</h2>
      </header>
      {caricamento.tipo === 'carico' && <p className={stile.messaggio}>Apro la scheda…</p>}
      {caricamento.tipo === 'assente' && <p className={stile.messaggio}>Questa visita non esiste più.</p>}
      {caricamento.tipo === 'guasto' && (
        <div className={stile.messaggio}>
          <p>Non riesco ad aprire la scheda.</p>
          <button type="button" className={stile.secondario} onClick={() => setTentativo((n) => n + 1)}>
            Riprova
          </button>
        </div>
      )}
      {nota !== null && <p className={stile.nota} role="status">{nota}</p>}
      {caricamento.tipo === 'pronta' && (
        <SchedaCompilata
          iniziale={caricamento.scheda}
          dati={caricamento.dati}
          richieste={richieste}
          azioni={azioni}
          onVaiA={onVaiA}
          onFatto={onFatto}
          onRicarica={(testo) => {
            setNota(testo)
            setTentativo((n) => n + 1)
          }}
        />
      )}
    </div>
  )
}

const MINUTI = Array.from({ length: 12 }, (_, i) => i * 5)
const ORE = Array.from({ length: 24 }, (_, i) => i)
// Da 5 minuti a 8 ore: oltre è una giornata intera, e si scrive in due servizi.
const DURATE = Array.from({ length: 96 }, (_, i) => i + 1)

function durataLeggibile(celle: number): string {
  const minuti = celle * 5
  const h = Math.floor(minuti / 60)
  const m = minuti % 60
  return h === 0 ? `${m} min` : m === 0 ? `${h} h` : `${h} h ${m} min`
}

/** La scheda caricata. Esportata per le prove sul componente. */
export function SchedaCompilata({
  iniziale,
  dati,
  richieste,
  azioni,
  onVaiA,
  onFatto,
  onRicarica,
}: {
  iniziale: Scheda
  dati: RispostaApri
  richieste: RichiesteScheda
  azioni: AzioniScheda
  onVaiA: (appuntamentoId: string, data: string) => void
  onFatto: (testo: string) => void
  onRicarica: (testo: string) => void
}) {
  const [scheda, setScheda] = useState(iniziale)
  // La scheda LETTA: quella aperta, o quella adottata dopo «La scheda
  // aggiornata». Serve a sapere se «Togli» porta altre modifiche (06/10).
  const [letta, setLetta] = useState(iniziale)
  const [inCorso, setInCorso] = useState(false)
  // §4.4: dopo «Non so» «Salva» è spento; «Controlla» arriva col Task 9.
  const [incerto, setIncerto] = useState(false)
  const [esito, setEsito] = useState<string | null>(null)
  // D3-19: le chiavi che il server ha trovato e la scheda forse non mostra
  // ancora (una collega ha scritto dopo la lettura del giorno).
  const [chiaviDelServer, setChiaviDelServer] = useState<readonly string[]>([])
  const [conflittoDelServer, setConflittoDelServer] = useState<{ frase: string; vaiA: string | null } | null>(null)
  const [clienteNome, setClienteNome] = useState<string | null>(dati.clienteNome)
  const [giorno, setGiorno] = useState<DatiGiorno>(dati.giorno)
  const [mostraTutti, setMostraTutti] = useState(false)
  const [conferma, setConferma] = useState<{ tipo: 'elimina' } | { tipo: 'togli'; id: string } | null>(null)
  const [guasto, setGuasto] = useState(false)
  const [telefonoScritto, setTelefonoScritto] = useState('')

  const catalogo: Catalogo = dati.catalogo
  const attive = dati.attive.map((o) => o.id)

  const suGuasto = (e: unknown) => {
    if (e instanceof UscitaForzata) esci()
    else setGuasto(true)
  }

  // La scheda lavora sul giorno della SUA data: se la data cambia, si rilegge
  // quel giorno per fasce, «già prenotata» e conflitti.
  useEffect(() => {
    if (scheda.data === giorno.data) return
    let viva = true
    richieste.giorno(scheda.data).then((g) => viva && setGiorno(g), (e) => viva && suGuasto(e))
    return () => {
      viva = false
    }
    // Decide la data della scheda: `giorno` cambia proprio per effetto di questa lettura.
  }, [scheda.data])

  const giornoPronto = giorno.data === scheda.data
  const nomiOperatrici = new Map<string, string>([
    ...dati.giorno.operatrici.map((o): [string, string] => [o.id, o.nome]),
    ...giorno.operatrici.map((o): [string, string] => [o.id, o.nome]),
    ...dati.attive.map((o): [string, string] => [o.id, o.nome]),
  ])
  const nomiServizi = new Map(catalogo.servizi.map((s) => [s.id, s.nome]))

  const cliente = scheda.cliente
  const nomeCliente = cliente === null ? null : cliente.tipo === 'nuova' ? cliente.nome.trim() : clienteNome
  const avvisi: Avviso[] = giornoPronto
    ? calcolaAvvisi({
        visitaId: scheda.visitaId,
        data: scheda.data,
        cliente: cliente !== null && nomeCliente ? { id: cliente.id, nome: nomeCliente } : null,
        servizi: scheda.servizi,
        giorno: { risolti: new Map(Object.entries(giorno.risolti)), appuntamenti: giorno.appuntamenti },
        nomiOperatrici,
        nomiServizi,
      })
    : []
  const conflitto = giornoPronto
    ? fraseDeiConflitti(
        trovaConflitti(scheda.servizi, giorno.appuntamenti, idInScrittura(scheda.servizi, scheda.attesi.map((a) => a.id)), nomiOperatrici),
      )
    : null
  const chiaviMostrate = new Set(avvisi.map((a) => a.chiave))
  const soloDelServer = chiaviDelServer.filter((k) => !chiaviMostrate.has(k))
  const ferma =
    fermaIlSalvataggio(avvisi, scheda.avvisiConfermati) || chiaviDelServer.some((k) => !scheda.avvisiConfermati.has(k))
  const mostraConflitto = conflitto ?? conflittoDelServer

  const bloccoD22 = bloccoDelSalva(scheda, attive)
  const mancante = cosaManca(scheda, cliente?.tipo === 'nuova' && telefonoDalModulo(telefonoScritto).errato)

  const servizi = (fn: (s: readonly ServizioInScheda[]) => ServizioInScheda[]) =>
    setScheda((s) => ({ ...s, servizi: fn(s.servizi) }))

  /** «Salva comunque» conferma le chiavi MOSTRATE (D3-19), e quelle che il server ha nominato. */
  const confermate = () => new Set([...confermaAvvisi(scheda.avvisiConfermati, avvisi), ...chiaviDelServer])

  const rileggiGiorno = (data: string, poi?: (g: DatiGiorno) => void) =>
    richieste.giorno(data).then(
      (g) => {
        setGiorno(g)
        poi?.(g)
      },
      suGuasto,
    )

  /** Ciò che la scheda fa con la risposta del server. */
  const leggiRisposta = (r: Risposta) => {
    switch (r.tipo) {
      case 'uscita_forzata':
        esci()
        return
      case 'esito': {
        const m = r.messaggio
        if (m.uscitaForzata) return esci()
        // Il ✓ chiude la scheda; un esito che ricarica il giorno anche.
        if (m.spunta || m.ricaricaIlGiorno) return onFatto(m.testo)
        if (m.schedaAdottaStato && r.stato) {
          // §4.4, «La scheda aggiornata»: il contenuto diventa lo stato
          // corrente con le sue versioni (C3: `adottaStato` riproietta).
          const nuova = adottaStato(scheda, r.stato)
          setScheda(nuova)
          setLetta(nuova)
          setChiaviDelServer([])
          setEsito(m.testo === '' ? SCHEDA_AGGIORNATA : m.testo)
          void rileggiGiorno(nuova.data, (g) => {
            const nome = g.appuntamenti.find((a) => a.visitaId === nuova.visitaId)?.clienteNome
            if (nome !== undefined) setClienteNome(nome)
          })
          return
        }
        // `annullato`: la risposta si scarta (§4.1).
        if (m.testo !== '') setEsito(m.testo)
        return
      }
      case 'fallita':
        if (r.messaggio.ricaricaIlGiorno) return onFatto(r.testo)
        if (r.messaggio.ricaricaLaScheda) return onRicarica(r.testo)
        setEsito(r.testo)
        return
      case 'conflitto':
        // La frase del server subito, e il giorno riletto: la scheda la ritrova da sé.
        setConflittoDelServer({ frase: r.frase, vaiA: r.vaiA })
        void rileggiGiorno(scheda.data)
        return
      case 'da_confermare':
        setChiaviDelServer(r.chiavi)
        void rileggiGiorno(scheda.data)
        return
      case 'non_so':
        setIncerto(true)
        setEsito('Non so se è stata salvata')
        return
      case 'app_aggiornata':
        setEsito('L’app è stata aggiornata: ricarica la pagina.')
        return
      case 'non_valida':
        setEsito(r.motivo)
        return
    }
  }

  /** Un invio: un codice nuovo (§4.4), e la risposta. Una promessa rifiutata è rete o rilascio nuovo. */
  const invia = async (chiamata: (codice: string) => Promise<Risposta>) => {
    const codice = crypto.randomUUID()
    setInCorso(true)
    setEsito(null)
    setConflittoDelServer(null)
    let r: Risposta
    try {
      r = await chiamata(codice)
    } catch (e) {
      // Next solleva così quando l'azione non esiste più dopo un rilascio.
      r = /Server Action/i.test(String((e as Error | null)?.message)) ? { tipo: 'app_aggiornata' } : { tipo: 'non_so' }
    }
    setInCorso(false)
    leggiRisposta(r)
  }

  const salva = () => {
    const s = ferma ? { ...scheda, avvisiConfermati: confermate() } : scheda
    setScheda(s)
    void invia((codice) => azioni.salva(serializza(s), codice))
  }

  /** «Togli» manda tutta la bozza (06/10): la riga ambra è sotto gli occhi, e la conferma vale anche per lei. */
  const togliEInvia = (id: string) => {
    const bozza = togli({ ...scheda, avvisiConfermati: confermate() }, id)
    void invia((codice) => azioni.togli(serializza(bozza), codice))
  }

  const elimina = () => {
    void invia((codice) => azioni.elimina(scheda.visitaId, scheda.versioneVisita!, scheda.attesi, codice))
  }

  const fermo = inCorso || incerto

  const operatriceDelNuovo = scheda.servizi[scheda.servizi.length - 1]?.operatriceId ?? scheda.partenza.operatriceId

  return (
    <div className={stile.corpo}>
      <section className={stile.sezione} aria-labelledby="scheda-cliente">
        <h3 id="scheda-cliente" className={stile.etichetta}>
          Cliente
        </h3>
        <CercaCliente
          cliente={scheda.cliente}
          nome={clienteNome}
          richieste={richieste}
          onGuasto={suGuasto}
          telefonoScritto={telefonoScritto}
          onTelefonoScritto={setTelefonoScritto}
          onCambia={(c, nome) => {
            setScheda((s) => ({ ...s, cliente: c }))
            setClienteNome(nome)
          }}
        />
      </section>

      <section className={stile.sezione}>
        <label className={stile.campo}>
          <span className={stile.etichetta}>Data</span>
          <input
            type="date"
            value={scheda.data}
            onChange={(e) => {
              try {
                const d = dataReale(e.target.value)
                setScheda((s) => ({ ...s, data: d }))
              } catch {
                // un campo svuotato a metà: la data resta quella di prima
              }
            }}
          />
        </label>
      </section>

      <section className={stile.sezione} aria-labelledby="scheda-servizi">
        <h3 id="scheda-servizi" className={stile.etichetta}>
          Servizi
        </h3>
        <label className={stile.spunta}>
          <input type="checkbox" checked={mostraTutti} onChange={(e) => setMostraTutti(e.target.checked)} />
          mostra tutti i servizi
        </label>
        <ol className={stile.servizi}>
          {scheda.servizi.map((s) => {
            const scelta = operatriceScelta(s, attive)
            const gruppi = serviziPerLaScelta(catalogo, s.operatriceId, mostraTutti)
            const nelleVoci = gruppi.some((g) => g.servizi.some((x) => x.id === s.servizioId))
            return (
              <li key={s.id} className={stile.servizio} aria-label={`${nomiServizi.get(s.servizioId) ?? 'Servizio'} alle ${oraDaCella(s.inizio)}`}>
                {scelta === null && (
                  <p className={stile.nonAttiva}>
                    {nomiOperatrici.get(s.operatriceId) ?? 'Operatrice'} — non più attiva
                  </p>
                )}
                <label className={stile.campo}>
                  <span>Operatrice</span>
                  <select
                    aria-label="Operatrice"
                    value={scelta ?? ''}
                    onChange={(e) => e.target.value !== '' && servizi((x) => cambiaOperatrice(x, s.id, e.target.value, catalogo))}
                  >
                    {scelta === null && (
                      <option value="" disabled>
                        Scegli un’operatrice
                      </option>
                    )}
                    {dati.attive.map((o) => (
                      <option key={o.id} value={o.id}>
                        {o.nome}
                      </option>
                    ))}
                  </select>
                </label>
                <label className={stile.campo}>
                  <span>Servizio</span>
                  <select aria-label="Servizio" value={s.servizioId} onChange={(e) => servizi((x) => cambiaServizio(x, s.id, e.target.value, catalogo))}>
                    {!nelleVoci && <option value={s.servizioId}>{nomiServizi.get(s.servizioId) ?? 'Servizio'}</option>}
                    {gruppi.map((g) => (
                      <optgroup key={g.categoria} label={g.categoria}>
                        {g.servizi.map((x) => (
                          <option key={x.id} value={x.id}>
                            {x.nome}
                          </option>
                        ))}
                      </optgroup>
                    ))}
                  </select>
                </label>
                <div className={stile.riga}>
                  <fieldset className={stile.ora}>
                    <legend>Inizio</legend>
                    <select
                      aria-label="Ora d’inizio"
                      value={Math.floor(s.inizio / 12)}
                      onChange={(e) => servizi((x) => cambiaInizio(x, s.id, Number(e.target.value) * 12 + (s.inizio % 12), catalogo))}
                    >
                      {ORE.map((h) => (
                        <option key={h} value={h}>
                          {String(h).padStart(2, '0')}
                        </option>
                      ))}
                    </select>
                    <span aria-hidden="true">:</span>
                    <select
                      aria-label="Minuti d’inizio"
                      value={(s.inizio % 12) * 5}
                      onChange={(e) =>
                        servizi((x) => cambiaInizio(x, s.id, Math.floor(s.inizio / 12) * 12 + Number(e.target.value) / 5, catalogo))
                      }
                    >
                      {MINUTI.map((m) => (
                        <option key={m} value={m}>
                          {String(m).padStart(2, '0')}
                        </option>
                      ))}
                    </select>
                  </fieldset>
                  <label className={stile.campo}>
                    <span>Durata</span>
                    <select aria-label="Durata" value={s.durata} onChange={(e) => servizi((x) => cambiaDurata(x, s.id, Number(e.target.value), catalogo))}>
                      {(DURATE.includes(s.durata) ? DURATE : [...DURATE, s.durata]).map((d) => (
                        <option key={d} value={d}>
                          {durataLeggibile(d)}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>
                <button
                  type="button"
                  className={stile.secondario}
                  disabled={fermo}
                  onClick={() => {
                    // Un servizio mai salvato si toglie dalla bozza; uno salvato
                    // è un invio, con una conferma (§8.7, §10.4). L'ultimo
                    // rimasto è «Elimina visita».
                    if (s.nuovo) setScheda((x) => togli(x, s.id))
                    else if (scheda.servizi.length === 1) setConferma({ tipo: 'elimina' })
                    else setConferma({ tipo: 'togli', id: s.id })
                  }}
                >
                  Togli
                </button>
              </li>
            )
          })}
        </ol>
        <label className={stile.campo}>
          <span className={stile.nascosto}>Aggiungi servizio</span>
          <select
            aria-label="Aggiungi servizio"
            value=""
            onChange={(e) => {
              if (e.target.value === '') return
              const id = e.target.value
              servizi((x) => aggiungiServizio(x, scheda.partenza, id, catalogo))
            }}
          >
            <option value="">+ Aggiungi servizio</option>
            {serviziPerLaScelta(catalogo, operatriceDelNuovo, mostraTutti).map((g) => (
              <optgroup key={g.categoria} label={g.categoria}>
                {g.servizi.map((x) => (
                  <option key={x.id} value={x.id}>
                    {x.nome}
                  </option>
                ))}
              </optgroup>
            ))}
          </select>
        </label>
      </section>

      {mostraConflitto !== null && (
        <div className={stile.conflitto} role="alert">
          <p>{mostraConflitto.frase}</p>
          {/* Un conflitto fra due servizi della scheda non ha un posto nell'agenda (C2). */}
          {mostraConflitto.vaiA !== null && (
            <button type="button" className={stile.secondario} onClick={() => onVaiA(mostraConflitto.vaiA!, scheda.data)}>
              Vai lì
            </button>
          )}
        </div>
      )}

      {(avvisi.length > 0 || bloccoD22 !== null || soloDelServer.length > 0) && (
        <div className={stile.ambra} role="status">
          {bloccoD22 !== null && <p>{bloccoD22}</p>}
          {avvisi.map((a) => (
            <p key={a.chiave}>{a.motivo}</p>
          ))}
          {soloDelServer.length > 0 && <p>Al salvataggio è comparso un avviso nuovo: ricontrolla la scheda.</p>}
        </div>
      )}
      {mancante !== null && bloccoD22 === null && <p className={stile.suggerimento}>{mancante}</p>}
      {guasto && <p className={stile.errore}>Non riesco a leggere i dati: controlla la connessione.</p>}
      {esito !== null && (
        <p className={stile.errore} role="status">
          {esito}
        </p>
      )}

      {conferma !== null && (
        <div className={stile.conferma} role="alertdialog" aria-label="Conferma">
          <p>
            {conferma.tipo === 'elimina'
              ? 'Eliminare la visita? Non si può annullare.'
              : altreModifiche(scheda, letta, conferma.id)
                ? 'Togliere questo servizio e salvare le altre modifiche?'
                : 'Togliere questo servizio dalla visita?'}
          </p>
          <div className={stile.pulsanti}>
            <button
              type="button"
              className={stile.pericolo}
              disabled={fermo}
              onClick={() => {
                if (conferma.tipo === 'elimina') elimina()
                else togliEInvia(conferma.id)
                setConferma(null)
              }}
            >
              {conferma.tipo === 'elimina' ? 'Elimina' : 'Togli'}
            </button>
            <button type="button" className={stile.secondario} onClick={() => setConferma(null)}>
              Annulla
            </button>
          </div>
        </div>
      )}

      <div className={stile.azioni}>
        <button type="button" className={stile.primario} disabled={bloccoD22 !== null || mancante !== null || fermo} onClick={salva}>
          {ferma ? 'Salva comunque' : 'Salva'}
        </button>
        {scheda.modo === 'modifica' && (
          <button type="button" className={stile.pericolo} disabled={fermo} onClick={() => setConferma({ tipo: 'elimina' })}>
            Elimina visita
          </button>
        )}
      </div>
      {/* Qui il Task 9 mette «Controlla», dopo un salvataggio incerto (§4.4). */}
    </div>
  )
}
