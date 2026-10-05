// src/app/(salone)/clienti/page.tsx
import stile from '../segnaposto.module.css'

export default function Clienti() {
  return (
    <section className={stile.pagina}>
      <h1 className={stile.titolo}>Clienti</h1>
      <p className={stile.testo}>Le clienti arrivano con il prossimo pezzo dell'app.</p>
    </section>
  )
}
