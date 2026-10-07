// playwright.config.ts
//
// Le prove da capo a fondo (spec 3a §8.3, piano 3a-2 Task 12).
//
// ⚠︎ Contro `next start`, mai `next dev`: in sviluppo la CSP ha le deroghe di
// React Refresh (`src/server/csp.ts`), e una prova verde lì non dice niente
// della produzione. Il server lo costruisce e lo avvia Playwright: il build
// legge `NEXT_PUBLIC_SUPABASE_URL` e `NEXT_PUBLIC_SUPABASE_ANON_KEY` da
// `.env.local` in locale e dall'ambiente in CI. Senza, la CSP chiude il `ws://`
// e il client del browser non nasce.
//
// ⚠︎ Un solo database: le prove vanno in serie (`workers: 1`), e mai insieme a
// `npm test`. Ogni prova prepara da sé il suo stato (`tests/e2e/aiuti.ts`).
import { defineConfig } from '@playwright/test'

// Il telefono, in verticale (§8.3): due larghezze, tocco vero.
const telefono = (width: number, height: number) => ({
  viewport: { width, height },
  isMobile: true,
  hasTouch: true,
  deviceScaleFactor: 3,
})

export default defineConfig({
  testDir: 'tests/e2e',
  globalSetup: './tests/e2e/preparazione.ts',
  workers: 1,
  fullyParallel: false,
  // D3-9: «Non so» e «Controlla» compaiono a 10 s dal tocco, e alcune prove li aspettano due volte.
  timeout: 90_000,
  expect: { timeout: 8_000 },
  retries: 0,
  reporter: [['list']],
  use: {
    baseURL: 'http://localhost:3000',
    locale: 'it-IT',
    trace: 'retain-on-failure',
  },
  projects: [
    { name: 'telefono-375', use: telefono(375, 812) },
    { name: 'telefono-430', use: telefono(430, 932) },
  ],
  webServer: {
    command: 'npm run build && npm run start',
    url: 'http://localhost:3000/accesso',
    // Mai un server già acceso: potrebbe essere un `next dev`, o un build vecchio.
    reuseExistingServer: false,
    timeout: 240_000,
    stdout: 'ignore',
    stderr: 'pipe',
  },
})
