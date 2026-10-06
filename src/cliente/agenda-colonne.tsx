// src/cliente/agenda-colonne.tsx
//
// L'agenda a colonne (spec 3a §5.1, spec §9.1). Nessun hook: si disegna sul
// server, e lo scorrimento del giorno lo aggiunge `ScorrimentoGiorno`.
//
// ⚠︎ NIENTE attributi `style`. La CSP di produzione ha `style-src 'self'`, e uno
// `style="…"` dal server funziona in `next dev` e SPARISCE in `next start`. La
// posizione sta nelle classi di `griglia.module.css`; il colore
// dell'operatrice, che arriva dal database, sta nell'attributo `fill` di un
// SVG, che è un attributo di presentazione e non uno stile in linea.
import {
  type AppuntamentoLetto,
  type BloccoAgenda,
  bloccoFuoriOrario,
  componiBlocchi,
  spaziFuoriOrario,
} from '../dominio/blocchi'
import { oraDaCella, oraDaConfine } from '../dominio/tempo'
import type { Giorno, OperatriceInColonna } from '../server/lettura-giorno'
import stile from './agenda.module.css'
import griglia from './griglia.module.css'
import { coloriDelBlocco } from './vista'

/** Più di tre colonne ATTIVE: le colonne scorrono in orizzontale (§9.1). */
export function colonneScorrono(operatrici: readonly OperatriceInColonna[]): boolean {
  return operatrici.filter((o) => o.attiva).length > 3
}

// Sotto mezz'ora (42 punti) un blocco porta solo il nome (D3-4).
const BASSO = 6
// Altezza minima di un blocco: 21 punti, tre righe (§7).
const MINIMO = 3

const riga = (cella: number, da: number) => griglia[`r${cella - da + 1}`]
const righe = (n: number) => griglia[`h${Math.max(1, n)}`]
const colonna = (n: number) => griglia[`c${n}`]

function Blocco({
  b,
  da,
  col,
  colore,
  fuoriOrario,
}: {
  b: BloccoAgenda
  da: number
  col: number
  colore: string
  fuoriOrario: boolean
}) {
  const { riempimento, testo, bordo } = coloriDelBlocco(colore)
  const primo: AppuntamentoLetto = b.appuntamenti[0]
  const servizi = b.appuntamenti.map((a) => a.servizioNome).join(' + ')
  const basso = b.fine - b.inizio < BASSO
  const etichetta =
    `${oraDaCella(b.inizio)}–${oraDaConfine(b.fine)}, ${primo.clienteNome}, ${servizi}` +
    (b.segnoDiVisita ? ', parte di una visita' : '') +
    (fuoriOrario ? ', fuori orario' : '')
  return (
    <article
      aria-label={etichetta}
      // Il tocco apre la scheda della visita (Task 7): lo legge `SchedaDellAgenda`.
      data-visita={b.visitaId}
      data-appuntamenti={b.appuntamenti.map((x) => x.id).join(' ')}
      role="button"
      tabIndex={0}
      className={[
        stile.blocco,
        testo === 'chiaro' ? stile.testoChiaro : stile.testoScuro,
        riga(b.inizio, da),
        righe(Math.max(b.fine - b.inizio, MINIMO)),
        colonna(col),
      ].join(' ')}
    >
      <svg className={stile.fondo} aria-hidden="true" preserveAspectRatio="none" viewBox="0 0 100 100">
        <rect
          x="0.75"
          y="0.75"
          width="98.5"
          height="98.5"
          rx="6"
          fill={riempimento}
          stroke={bordo}
          strokeWidth="1.5"
          vectorEffect="non-scaling-stroke"
        />
      </svg>
      <span className={stile.testo} aria-hidden="true">
        {!basso && <span className={stile.ora}>{oraDaCella(b.inizio)} </span>}
        <span className={stile.nome}>{primo.clienteNome}</span>
        {!basso && <span className={stile.servizio}>{servizi}</span>}
      </span>
      {b.segnoDiVisita && (
        <span className={stile.segnoVisita} aria-hidden="true">
          ◆
        </span>
      )}
      {fuoriOrario && <span className={stile.segnoFuori} aria-hidden="true" />}
    </article>
  )
}

export function AgendaColonne({
  giorno,
  oggi,
  lineaDellOra,
}: {
  giorno: Giorno
  /** Il giorno di Perugia: il segno «fuori orario» vale oggi e nei giorni futuri. */
  oggi: string
  /** La cella della linea dell'ora, solo se il giorno mostrato è oggi. */
  lineaDellOra: number | null
}) {
  const { da, a } = giorno.finestra
  const blocchi = componiBlocchi(giorno.appuntamenti)
  const segnaFuori = giorno.data >= oggi
  const scorre = colonneScorrono(giorno.operatrici)
  // Righe dell'ora e linea dell'ora attraversano tutte le colonne delle
  // operatrici: con le colonne implicite `2 / -1` non arriva in fondo.
  const tutte = `${colonna(2)} ${griglia[`w${Math.max(1, giorno.operatrici.length)}`]}`

  // Una riga ogni mezz'ora, e l'etichetta dell'ora sulle ore intere.
  const mezzore: number[] = []
  for (let t = Math.ceil(da / 6) * 6; t < a; t += 6) mezzore.push(t)

  return (
    <div className={`${stile.contenitore} ${scorre ? stile.scorre : ''}`}>
      <div className={`${stile.intestazioni} ${scorre ? stile.colonneFisse : stile.colonneLibere}`}>
        <span className={colonna(1)} />
        {giorno.operatrici.map((o, i) => {
          const { riempimento, bordo } = coloriDelBlocco(o.colore)
          return (
            <div key={o.id} className={`${stile.intestazione} ${colonna(i + 2)}`}>
              <svg className={stile.pallino} aria-hidden="true" viewBox="0 0 12 12">
                <circle cx="6" cy="6" r="5" fill={riempimento} stroke={bordo} strokeWidth="1.5" />
              </svg>
              <span className={stile.nomeOperatrice}>{o.nome}</span>
              {/* §5.1: la colonna dell'account si etichetta «tu», non con un colore. */}
              {o.sonoIo && <span className={stile.tu}>tu</span>}
              {!o.attiva && <span className={stile.disattivata}>non attiva</span>}
            </div>
          )
        })}
      </div>

      <div
        className={`${stile.griglia} ${scorre ? stile.colonneFisse : stile.colonneLibere}`}
        role="group"
        aria-label="Appuntamenti del giorno"
      >
        {mezzore.map((t) => (
          <div key={`r${t}`} className={`${stile.regola} ${t % 12 === 0 ? stile.regolaOra : ''} ${riga(t, da)} ${righe(1)} ${tutte}`} />
        ))}
        {mezzore
          .filter((t) => t % 12 === 0)
          .map((t) => (
            <span key={`o${t}`} className={`${stile.ora} ${stile.etichettaOra} ${riga(t, da)} ${righe(1)} ${colonna(1)}`}>
              {oraDaConfine(t)}
            </span>
          ))}

        {giorno.operatrici.map((o, i) =>
          spaziFuoriOrario(giorno.risolti.get(o.id)?.ranges ?? [], giorno.finestra).map((s) => (
            <div
              key={`f${o.id}${s.da}`}
              aria-hidden="true"
              className={[
                stile.fuori,
                segnaFuori ? stile.tratteggio : '',
                riga(s.da, da),
                righe(s.a - s.da),
                colonna(i + 2),
              ].join(' ')}
            />
          )),
        )}

        {/* Lo spazio di ogni colonna, sotto i blocchi: il tocco su uno spazio
            libero apre una scheda vuota all'orario di §5.1 (Task 7). */}
        {giorno.operatrici.map((o, i) => (
          <div
            key={`s${o.id}`}
            aria-hidden="true"
            data-colonna={o.id}
            data-da={da}
            data-a={a}
            className={`${stile.spazio} ${riga(da, da)} ${righe(a - da)} ${colonna(i + 2)}`}
          />
        ))}

        {blocchi.map((b) => {
          const i = giorno.operatrici.findIndex((o) => o.id === b.operatriceId)
          // Un appuntamento di un'operatrice senza colonna non può esistere:
          // la lettura tiene ogni operatrice con appuntamenti.
          if (i < 0) throw new Error(`blocco senza colonna: ${b.operatriceId}`)
          const fasce = giorno.risolti.get(b.operatriceId)?.ranges ?? []
          return (
            <Blocco
              key={`${b.visitaId}${b.inizio}${b.operatriceId}`}
              b={b}
              da={da}
              col={i + 2}
              colore={giorno.operatrici[i].colore}
              fuoriOrario={segnaFuori && bloccoFuoriOrario(b, fasce)}
            />
          )
        })}

        {lineaDellOra !== null && lineaDellOra >= da && lineaDellOra < a && (
          <div
            role="img"
            aria-label={`Ora: ${oraDaConfine(lineaDellOra)}`}
            className={`${stile.linea} ${riga(lineaDellOra, da)} ${righe(1)} ${tutte}`}
          />
        )}
        {/* La riga finale tiene la griglia alta quanto la finestra. */}
        <span aria-hidden="true" className={`${riga(a - 1, da)} ${righe(1)} ${colonna(1)}`} />
      </div>
    </div>
  )
}
