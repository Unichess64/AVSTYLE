// src/app/(salone)/disponibilita/page.tsx
import stile from '../segnaposto.module.css'

export default function Disponibilita() {
  return (
    <section className={stile.pagina}>
      <h1 className={stile.titolo}>Disponibilità</h1>
      <p className={stile.testo}>Gli orari arrivano con il prossimo pezzo dell'app.</p>
    </section>
  )
}
