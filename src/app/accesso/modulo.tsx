// src/app/accesso/modulo.tsx
'use client'

import { useActionState } from 'react'
import { type StatoAccesso, entra } from './azioni'
import stile from './accesso.module.css'

const iniziale: StatoAccesso = { errore: null }

export function ModuloAccesso() {
  const [stato, invia, inCorso] = useActionState(entra, iniziale)
  return (
    <form action={invia} className={stile.modulo}>
      <label className={stile.campo}>
        <span>Email</span>
        <input name="email" type="email" autoComplete="username" inputMode="email" required />
      </label>
      <label className={stile.campo}>
        <span>Password</span>
        <input name="password" type="password" autoComplete="current-password" required />
      </label>
      {stato.errore !== null && (
        <p role="alert" className={stile.errore}>
          {stato.errore}
        </p>
      )}
      <button type="submit" className={stile.entra} disabled={inCorso}>
        Entra
      </button>
    </form>
  )
}
