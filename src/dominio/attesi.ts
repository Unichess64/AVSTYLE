// src/dominio/attesi.ts
//
// §4.1 regola 6, contratto MISURATO il 25/09/2026. Il confronto lato database
// è un `is distinct from` fra due array jsonb, che in PostgreSQL è
// POSIZIONALE: «insieme» lì significa «insieme confrontato in una forma
// canonica», non confronto insiemistico. Chi chiama deve quindi, ogni volta:
//
//   — PROIETTARE su {id, versione} e SOLO quelle due chiavi. `stato_visita` ne
//     restituisce sei (id, versione, operatrice, servizio, inizio, durata), e
//     passarlo così com'è dà `modificata_altrove` per sempre;
//   — ORDINARE per id. Gli stessi elementi in ordine diverso danno
//     `modificata_altrove`.
//
// Chi riparte dalla risposta di un `salvata` è già conforme: la funzione la
// restituisce in questa forma. Chi riparte da `stato` dopo un
// `modificata_altrove` — che è ciò che §4.4 gli IMPONE — deve passare di qui.
//
// L'ordine è quello dei caratteri, non `localeCompare`: PostgreSQL ordina gli
// uuid per byte, e sulla forma testuale minuscola che restituisce i due
// ordini coincidono. La versione resta il testo arrivato (§10.2, C4).

export interface Atteso {
  readonly id: string
  readonly versione: string
}

export function proiettaAttesi(
  appuntamenti: readonly { id: string; versione: string }[],
): Atteso[] {
  return appuntamenti
    .map(({ id, versione }) => ({ id, versione }))
    .sort((x, y) => (x.id < y.id ? -1 : x.id > y.id ? 1 : 0))
}
