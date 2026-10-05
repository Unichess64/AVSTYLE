// src/server/gotrue.ts
// Una regola sola per il middleware e per `operatriceCorrente` (§4.7).

/**
 * 400/401/403 = risposta CONFERMATA di GoTrue: non c'è sessione valida. Tutto
 * il resto (5xx, fetch caduta) è un guasto di trasporto — e anche il 429, che
 * è un 4xx ma dice «troppe richieste», non «chi sei» (revisione del Task 3).
 */
export function confermataDaGoTrue(error: { status?: number }): boolean {
  const stato = error.status
  return stato !== undefined && stato >= 400 && stato < 500 && stato !== 429
}
