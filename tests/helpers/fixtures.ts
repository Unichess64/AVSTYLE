import { ALESSANDRA, ANNALISA, VERA, asOwner } from './db'

export const CAT_NAILS = '20000000-0000-4000-8000-000000000001'
export const CAT_BODY = '20000000-0000-4000-8000-000000000002'
export const SERVICE_REFILL = '30000000-0000-4000-8000-000000000001'
export const SERVICE_MASSAGE = '30000000-0000-4000-8000-000000000002'
export const CLIENT_MARIA = '40000000-0000-4000-8000-000000000001'
export const CLIENT_LUCIA = '40000000-0000-4000-8000-000000000002'
export const DAY_ONE = '2026-03-12'
export const DAY_TWO = '2026-03-19'

/**
 * Two categories, two services, two clients, three operators; callers use two
 * dates. Spec §13.2 opens by requiring this: with one of anything, every
 * predicate that scopes by it is declared and never exercised.
 *
 * Split into seedCatalogue() and seedClients() because the tables they touch
 * land in the schema on different tasks (the catalogue in Task 4,
 * client in Task 5); seedFixture() is the combined convenience for tasks
 * where both exist.
 */
export async function seedCatalogue(): Promise<void> {
  await asOwner(async (c) => {
    await c.query(
      `insert into service_category (id, name, sort_order) values ($1, 'Unghie', 1), ($2, 'Corpo', 2)`,
      [CAT_NAILS, CAT_BODY],
    )
    await c.query(
      `insert into service (id, name, category_id, default_duration_cells, buffer_after_cells)
       values ($1, 'Refill gel', $2, 18, 0), ($3, 'Massaggio', $4, 10, 3)`,
      [SERVICE_REFILL, CAT_NAILS, SERVICE_MASSAGE, CAT_BODY],
    )
    await c.query(
      `insert into operator_service (operator_id, service_id) values ($1, $3), ($2, $3), ($4, $5)`,
      [VERA, ANNALISA, SERVICE_REFILL, ALESSANDRA, SERVICE_MASSAGE],
    )
  })
}

export async function seedClients(): Promise<void> {
  await asOwner(async (c) => {
    await c.query(
      `insert into client (id, full_name, phone) values
         ($1, 'Maria Rossi', '+393331234567'),
         ($2, 'Lucia Ciccarè', '+393337654321')`,
      [CLIENT_MARIA, CLIENT_LUCIA],
    )
  })
}

export async function seedFixture(): Promise<void> {
  await seedCatalogue()
  await seedClients()
}
