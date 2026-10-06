// src/dominio/annulla.ts
//
// «Annulla» dopo uno spostamento (spec 3a §5.1, la tabella di «Annulla»; piano
// 3a-2 Task 10). Compare solo dopo un `salvata` diretto o un «✓ Spostata» di
// «Controlla», si spegne al primo tocco, ha UN SUO codice d'invio e riscrive
// la posizione di prima con le versioni ADOTTATE dopo il ✓.
//
// I messaggi parlano dell'ANNULLAMENTO e dicono dove sta la visita secondo
// l'ultima LETTURA, mai secondo la memoria del telefono. La decisione è quella
// dello spostamento (`messaggioDelGesto`), con le parole di questa tabella.
import {
  type Gesto,
  type MessaggioSpostamento,
  type Parole,
  type RispostaAlGesto,
  messaggioDelGesto,
} from './trascinamento'

export type MessaggioAnnulla = Omit<MessaggioSpostamento, 'offreAnnulla'>

const NON_SALVATO = 'L’annullamento non è stato salvato'
const NON_TROVO = 'Non ho annullato: non trovo più questa visita'

const PAROLE_DI_ANNULLA: Parole = {
  fatto: (ora) => `✓ Riportata alle ${ora}`,
  nonSalvatoPresente: (ora) => (ora === null ? NON_SALVATO : `${NON_SALVATO}: la visita ora è alle ${ora}`),
  nonSalvatoAssente: `${NON_SALVATO}: la visita è stata cancellata`,
  // La «riga 3»: l'orario si nomina SOLO se è cambiato, perché la collega può
  // aver cambiato servizio od operatrice senza toccare l'ora.
  diversa: (fatta, letta) =>
    `Riportata alle ${fatta}, ma poi la visita è stata cambiata${letta !== null && letta !== fatta ? `: ora è alle ${letta}` : ''}`,
  // L'orario solo se la rilettura ne trova uno.
  modificata: (letta) => `Non ho annullato: la visita è stata cambiata${letta === null ? '' : `: ora è alle ${letta}`}`,
  cancellata: 'Non ho annullato: la visita è stata cancellata',
  // MAI «è stata cancellata»: la tabella delle cancellate lo smentirebbe.
  nonTrovata: NON_TROVO,
  riga5: NON_TROVO,
  annullato: NON_SALVATO,
  // L12: nessuna offerta di ricrearla.
  cancellataDopo: 'La visita è stata cancellata',
  fallita: 'Non sono riuscita ad annullare',
}

/** Il gesto di «Annulla»: ogni appuntamento torna dove l'agenda lo mostrava prima dello spostamento. */
export function gestoDiAnnulla(spostamento: Gesto): Gesto {
  const prima = new Map(spostamento.mossi.map((m) => [m.id, m.da]))
  return {
    ...spostamento,
    mossi: spostamento.mossi.map((m) => ({ id: m.id, da: m.a, a: m.da })),
    dopo: spostamento.dopo.map((x) => ({ ...x, inizio: prima.get(x.id) ?? x.inizio })),
  }
}

/** `g` è il gesto di «Annulla»: le sue destinazioni sono la posizione di prima. */
export function messaggioDiAnnulla(r: RispostaAlGesto, g: Gesto): MessaggioAnnulla {
  const { offreAnnulla: _, ...m } = messaggioDelGesto(r, g, PAROLE_DI_ANNULLA)
  return m
}
