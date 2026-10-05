// src/app/page.tsx
import { redirect } from 'next/navigation'

// Il manifesto apre `/` dalla schermata Home: l'atterraggio è l'agenda.
export default function Radice() {
  redirect('/agenda')
}
