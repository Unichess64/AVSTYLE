// src/app/accesso/page.tsx
import { ModuloAccesso } from './modulo'
import stile from './accesso.module.css'

export default function Accesso() {
  return (
    <main className={stile.pagina}>
      <div className={stile.entrata}>
        {/* Un <img> semplice: `next/image` scrive uno `style` in linea, che la
            CSP di produzione (style-src 'self') blocca. */}
        <img src="/AV-style-logo.png" alt="" width={248} height={230} className={stile.logo} />
        <h1 className={stile.marchio}>AVStyle</h1>
        <ModuloAccesso />
        {/* D2-3: niente link «Password dimenticata». */}
        <p className={stile.nota}>Se hai dimenticato la password, chiedi a chi gestisce il salone.</p>
      </div>
    </main>
  )
}
