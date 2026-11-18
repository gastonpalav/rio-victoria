# Río Victoria — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Web pública que muestra la altura del río Paraná en Victoria (y demás puertos de Prefectura) con identidad visual propia, alimentada por un scraper propio que guarda el historial en Postgres.

**Architecture:** Monorepo npm workspaces. `packages/core` tiene parsers de Prefectura, esquema Drizzle, consultas y lógica de dominio (niveles, frescura, aguas arriba). `apps/scraper` es un cron de Railway que lee Prefectura cada 30 min y hace upsert en Postgres (Railway). `apps/web` es Next.js App Router en Vercel Hobby que lee de esa base y expone páginas + API JSON.

**Tech Stack:** Node 24, TypeScript, npm workspaces, Vitest, cheerio, Drizzle ORM (`postgres` driver en prod, `@electric-sql/pglite` en tests), Next.js (App Router, última estable), Railway (cron + Postgres), Vercel Hobby.

**Spec:** `docs/superpowers/specs/2026-11-18-rio-victoria-design.md` — leerlo antes de cualquier tarea.

## Global Constraints

- Costo extra $0: Railway Pro existente (scraper + Postgres), Vercel Hobby (web), GitHub (código). Nada que requiera plan nuevo.
- Fuente: `https://contenidosweb.prefecturanaval.gob.ar/alturas/` (tabla principal) y `/alturas/?page=historico&tiempo=N&id=ID` (historial; `tiempo=365` = 1 año, máximo).
- Horas de Prefectura en ART (UTC−3 fijo, sin horario de verano). Se guarda UTC, se muestra ART.
- Lecturas actuales salen de la tabla principal; historial solo para backfill y relleno de huecos. Upsert por `(station_id, ts)`; si choca tabla vs historial, **gana la tabla**.
- "Actualizado hace X" se calcula con el `ts` de la lectura, nunca con la hora del scrape.
- Dato viejo: por puerto, `max(3 × periodo_horas, 6) h`.
- "Alerta" y "Evacuación" se presentan como **niveles de Prefectura**, nunca como instrucciones. Footer: "Fuente: Prefectura Naval Argentina" (link) + "Sitio no oficial".
- Puertos de Brasil (caudal/cota: GUAYRA, REPRESA ITAIPU, y cualquiera cuyo nombre contenga "(BRASIL)" o esté en `HIDDEN_STATIONS`) se guardan pero no se muestran.
- `/` muestra Victoria (Prefectura id 260). Copia de UI en castellano rioplatense simple. Mobile first.
- El parser falla ruidosamente si cambia la estructura (0 filas o columnas `data-label` faltantes): no guarda nada y el proceso sale con código 1.
- Fetch a Prefectura: User-Agent `rio-victoria/1.0 (+<url del repo>)`, timeout 20 s, sin datos personales del autor en headers.
- Crear el repo público de GitHub, desplegar en Railway/Vercel y conectar dominios son acciones externas: **pedir OK al autor antes** de cada una.

## Review Focus

1. **Una fila con valor no numérico** (`S/D`, `-`, vacío) en altura o umbrales → esa fila se saltea (o el umbral queda `null`) y el resto del scrape se guarda. Test en Task 1.
2. **Prefectura caída, timeout o página de error HTML** → el run queda en `scrape_runs` con `ok=false`, no se escribe ninguna lectura, exit code 1; la web sigue mostrando lo último con el aviso de dato viejo. Tests en Task 4 y Task 6.
3. **Puerto que no reporta hace días** (su `Fecha Hora` es vieja) → se guarda con su propio `ts`, y la UI muestra "Prefectura no publicó datos nuevos desde …" en vez de presentarlo como actual. Test en Task 6.
4. **Historial que pisa a la tabla** para el mismo `ts` con otro valor → el valor de la tabla se mantiene. Test en Task 3.
5. **Puertos sin umbrales** (todo el Delta) → no se dibuja la barra alerta/evacuación ni se dice "normal"; se muestra solo altura y tendencia. Test en Task 6 y Task 9.

---

## File Structure

```
package.json                    workspaces, scripts raíz (test, typecheck, lint)
tsconfig.base.json
packages/core/
  src/time.ts                   parseo de fechas de Prefectura → Date UTC; formato ART
  src/parse-current.ts          tabla principal → CurrentRow[]
  src/parse-history.ts          página historial → HistoryPoint[]
  src/slug.ts                   slugify + displayName
  src/stations.ts               HIDDEN_STATIONS, upstreamOf()
  src/domain.ts                 levelOf(), staleness(), thresholdsProgress()
  src/db/schema.ts              tablas Drizzle
  src/db/client.ts              createDb(url) / createTestDb()
  src/db/repo.ts                upserts y consultas
  src/index.ts                  re-exports
  drizzle/                      migraciones generadas por drizzle-kit
  test/fixtures/main.html       copia del fetch crudo del 2026-11-18
  test/fixtures/hist-260.html   historial Victoria tiempo=365
  test/*.test.ts
apps/scraper/
  src/fetch.ts                  fetchPrefectura(url) con UA + timeout
  src/jobs.ts                   runScrape, runBackfill, runGapFill
  src/main.ts                   CLI: `scrape` | `backfill` | `gapfill` | `probe`
  test/jobs.test.ts
  railway.json                  cron "*/30 * * * *"
apps/web/                       Next.js
  app/layout.tsx, app/page.tsx, app/[slug]/page.tsx, app/estado/page.tsx
  app/api/stations/route.ts, app/api/stations/[slug]/readings/route.ts
  app/[slug]/opengraph-image.tsx, app/opengraph-image.tsx
  components/                   Hero, LevelGauge, HeightChart, Upstream, StationPicker, StaleBanner, SourceFooter, Logo
  lib/data.ts                   lectura de la base para las páginas (usa repo de core)
  styles/tokens.css             tokens de la identidad visual (Task 7)
README.md
```

---

### Task 1: Monorepo + parser de la tabla principal

**Files:**
- Create: `package.json`, `tsconfig.base.json`, `.gitignore`, `packages/core/package.json`, `packages/core/tsconfig.json`, `packages/core/vitest.config.ts`
- Create: `packages/core/src/time.ts`, `packages/core/src/parse-current.ts`, `packages/core/src/slug.ts`
- Create: `packages/core/test/fixtures/main.html` (copiar de `C:\Users\GASTON~1\AppData\Local\Temp\claude\376c0a096587e774\98e6a612-d7b5-4acd-b4a2-b2a07691557f\scratchpad\raw\main.html`; si ya no existe, volver a bajarlo con curl y ajustar los valores esperados de los tests a ese archivo)
- Test: `packages/core/test/time.test.ts`, `packages/core/test/parse-current.test.ts`, `packages/core/test/slug.test.ts`

**Interfaces:**
- Produces:
  - `parsePrefecturaDateTime(s: string): Date` — acepta `"18/NOV/26 - 1600"`; meses `ENE FEB MAR ABR MAY JUN JUL AGO SEP OCT NOV DIC`; año `20YY`; ART→UTC (+3 h). Lanza `Error` si no matchea.
  - `parseHistoryDateTime(s: string): Date` — acepta `"2026-11-18 06:00"` (ART).
  - `formatArt(d: Date): string` → `"18/11 16:00"`.
  - `type CurrentRow = { prefecturaId: number; name: string; river: string; heightM: number; variationM: number | null; periodHours: number | null; ts: Date; stateText: string; prevHeightM: number | null; prevTs: Date | null; alertM: number | null; evacuationM: number | null }`
  - `parseCurrentTable(html: string): { rows: CurrentRow[]; skipped: { name: string; reason: string }[] }` — itera `tr` que tengan `th[data-label="Puerto:"]`; lee celdas por `data-label` (`Río:`, `Ultimo Registro:`, `Variacion`, `Periodo`, `Fecha Hora:`, `Estado:`, `Registro Anterior:`, `Fecha Anterior:`, `Alerta:`, `Evacuación:`); `prefecturaId` sale del `id=` del link Hist. Lanza `ParseError` si hay 0 filas o falta el `data-label` `Ultimo Registro:` en todas.
  - `slugify(name: string): string` — minúsculas, sin acentos, no alfanumérico → `-`. `displayName(name: string): string` — Title Case (`"SAN LORENZO"` → `"San Lorenzo"`), con mapa de excepciones `{ "PARANA": "Paraná", "ITUZAINGO": "Ituzaingó", "ITATI": "Itatí", "ZARATE": "Zárate", "MARTIN GARCIA": "Martín García" }` (ampliable).

- [ ] **Step 1: Scaffold** — `git init` ya hecho. Raíz con workspaces `["packages/*","apps/*"]`, scripts `test` (`vitest run` en cada workspace), `typecheck`. Instalar `typescript vitest cheerio` en core. Copiar fixture.

- [ ] **Step 2: Tests que fallan**

```ts
// time.test.ts
expect(parsePrefecturaDateTime("18/NOV/26 - 1600").toISOString()).toBe("2026-11-18T19:00:00.000Z");
expect(parsePrefecturaDateTime("31/DIC/26 - 2200").toISOString()).toBe("2027-01-01T01:00:00.000Z");
expect(parseHistoryDateTime("2026-11-18 06:00").toISOString()).toBe("2026-11-18T09:00:00.000Z");
expect(() => parsePrefecturaDateTime("S/D")).toThrow();

// parse-current.test.ts (fixture main.html)
const { rows, skipped } = parseCurrentTable(html);
expect(rows.length + skipped.length).toBe(91);            // 91 puertos en el fixture
const v = rows.find(r => r.name === "VICTORIA")!;
expect(v).toMatchObject({ prefecturaId: 260, river: "PARANA", heightM: 4.85, variationM: 0.01, periodHours: 2, alertM: 4.6, evacuationM: 4.9, prevHeightM: 4.84, stateText: "ALERTA CRECE" });
expect(v.ts.toISOString()).toBe("2026-11-18T19:00:00.000Z");
expect(rows.find(r => r.name === "ROSARIO")!.prefecturaId).toBe(280);
expect(rows.find(r => r.river === "DELTA PARANA")!.alertM).toBeNull();   // Review Focus 5
// Review Focus 1: fila con altura "S/D" se saltea, no rompe
const broken = html.replace(/(VICTORIA<\/th>[\s\S]*?Ultimo Registro:"[^>]*>)4\.85/, "$1S/D");
const r2 = parseCurrentTable(broken);
expect(r2.rows.find(r => r.name === "VICTORIA")).toBeUndefined();
expect(r2.skipped).toContainEqual(expect.objectContaining({ name: "VICTORIA" }));
expect(r2.rows.length).toBe(rows.length - 1);
expect(() => parseCurrentTable("<html><body>Mantenimiento</body></html>")).toThrow(ParseError);

// slug.test.ts
expect(slugify("SANTA FE")).toBe("santa-fe");
expect(slugify("REPRESA ITAIPÚ (BRASIL)")).toBe("represa-itaipu-brasil");
expect(displayName("PARANA")).toBe("Paraná");
expect(displayName("SAN LORENZO")).toBe("San Lorenzo");
```

Datos verificados en el fixture: la variación viene con signo (`-0.01`) y a veces es `-` (→ `null`); hay 2 filas con altura `S/E` (sin estación/dato) que deben ir a `skipped`. Agregar:

```ts
expect(rows.find(r => r.name === "LIBERTAD")!.variationM).toBe(-0.6);
expect(skipped.filter(s => /S\/E/.test(s.reason)).length).toBe(2);
```

- [ ] **Step 3: Correr** `npm test -w packages/core` → FAIL (módulos no existen).
- [ ] **Step 4: Implementar** `time.ts`, `slug.ts`, `parse-current.ts` (cheerio; números con `parseFloat` tras quitar ` Mts`; `NaN` → `null` en opcionales, fila salteada si `heightM` o `ts` no parsean).
- [ ] **Step 5: Correr** → PASS. `npm run typecheck` → sin errores.
- [ ] **Step 6: Commit** `feat(core): parser de la tabla principal de Prefectura`

---

### Task 2: Parser del historial

**Files:**
- Create: `packages/core/src/parse-history.ts`, `packages/core/test/fixtures/hist-260.html` (copiar `...\scratchpad\raw\hist.html`)
- Test: `packages/core/test/parse-history.test.ts`

**Interfaces:**
- Consumes: `parseHistoryDateTime` (Task 1).
- Produces: `type HistoryPoint = { ts: Date; heightM: number }`; `parseHistory(html: string): HistoryPoint[]` — filas de `table.fpTable tbody tr`; fecha del texto de la 1ª `td`, altura de la 2ª `td` (`"4.74 Mts"`). Devuelve orden ascendente por `ts`. `ParseError` si no existe la tabla. Tabla existente con 0 filas → `[]`.

- [ ] **Step 1: Test que falla**

```ts
const pts = parseHistory(hist);
expect(pts.length).toBe(715);
expect(pts[0]).toEqual({ ts: new Date("2025-11-18T15:00:00Z"), heightM: 3.37 });
expect(pts.at(-1)).toEqual({ ts: new Date("2026-11-18T09:00:00Z"), heightM: 4.74 });
expect(() => parseHistory("<html></html>")).toThrow(ParseError);
```

- [ ] **Step 2: Correr** → FAIL. **Step 3: Implementar.** **Step 4: Correr** → PASS.
- [ ] **Step 5: Commit** `feat(core): parser del historial de Prefectura`

---

### Task 3: Base de datos (esquema, migraciones, repo)

**Files:**
- Create: `packages/core/src/db/schema.ts`, `client.ts`, `repo.ts`, `packages/core/drizzle.config.ts`, `packages/core/drizzle/*` (generado)
- Test: `packages/core/test/repo.test.ts`

**Interfaces:**
- Consumes: `CurrentRow`, `HistoryPoint`, `slugify`.
- Produces:
  - Tablas: `stations(id int pk /*prefecturaId*/, slug text unique, name text, river text, river_order int, alert_m real null, evacuation_m real null, period_hours real null, hidden bool default false, updated_at timestamptz)`; `readings(station_id int fk, ts timestamptz, height_m real, source text check in ('tabla','historial'), scraped_at timestamptz, pk(station_id, ts))`; `scrape_runs(id serial, kind text, started_at, finished_at, ok bool, inserted int, skipped int, error text null)`.
  - `createDb(url: string): Db` (driver `postgres`, `ssl: 'require'` si la URL no es local); `createTestDb(): Promise<Db>` (pglite + migraciones aplicadas).
  - `upsertStations(db, rows: CurrentRow[]): Promise<void>` — `river_order` = índice de la fila dentro de su río en el orden de la página; `hidden` según `isHidden(name)` (Task 6 lo define; en esta tarea, importar desde `stations.ts` creando ya `HIDDEN_STATIONS = ["GUAYRA","REPRESA ITAIPU","CAIXA","CAPANEMA"]` y `isHidden(name) = HIDDEN_STATIONS.some(...) || name.includes("BRASIL")`).
  - `upsertReadings(db, stationId: number, points: { ts: Date; heightM: number }[], source: 'tabla'|'historial'): Promise<number>` — devuelve filas insertadas. Con `source='tabla'`: on conflict update. Con `source='historial'`: on conflict update **solo si** la fila existente es `historial` (Review Focus 4).
  - `startRun(db, kind) → runId`, `finishRun(db, runId, { ok, inserted, skipped, error? })`.
  - `getStations(db): Promise<StationWithLatest[]>` (visibles, con última lectura y la anterior); `getStationBySlug(db, slug)`; `getSeries(db, stationId, from: Date, to: Date): Promise<{ ts: Date; heightM: number }[]>` ascendente; `getLastRuns(db, n)`.

- [ ] **Step 1: Tests que fallan** (pglite):

```ts
await upsertStations(db, rows);               // rows de main.html
expect((await getStationBySlug(db, "victoria"))!.id).toBe(260);
expect(await upsertReadings(db, 260, [{ ts: T, heightM: 4.85 }], "tabla")).toBe(1);
expect(await upsertReadings(db, 260, [{ ts: T, heightM: 4.85 }], "tabla")).toBe(0);      // idempotente
await upsertReadings(db, 260, [{ ts: T, heightM: 4.70 }], "historial");
expect((await getSeries(db, 260, T0, T1))[0].heightM).toBe(4.85);                         // gana la tabla
expect((await getStations(db)).some(s => s.slug === "represa-itaipu-brasil")).toBe(false); // ocultos
```

- [ ] **Step 2: Correr** → FAIL. **Step 3: Implementar** esquema, `npx drizzle-kit generate`, client y repo. **Step 4: Correr** → PASS.
- [ ] **Step 5: Commit** `feat(core): esquema postgres y repositorio`

---

### Task 4: Jobs del scraper

**Files:**
- Create: `apps/scraper/package.json`, `tsconfig.json`, `src/fetch.ts`, `src/jobs.ts`, `src/main.ts`
- Test: `apps/scraper/test/jobs.test.ts`

**Interfaces:**
- Consumes: todo lo de core.
- Produces:
  - `type Fetcher = (url: string) => Promise<string>`; `fetchPrefectura: Fetcher` (UA y timeout de Global Constraints; status ≠ 200 → throw).
  - `runScrape(db, fetcher): Promise<RunResult>` — fetch principal → `parseCurrentTable` → `upsertStations` → por fila `upsertReadings([{ts, heightM}], 'tabla')` y también `prevTs/prevHeightM` si existen → `finishRun`. Cualquier excepción: `finishRun(ok:false, error)` y re-throw. Todo dentro de una transacción: si falla no queda nada escrito.
  - `runBackfill(db, fetcher, opts: { days: 365; stationIds?: number[] })` — por estación visible: fetch historial, `upsertReadings(..., 'historial')`, pausa 1 s entre estaciones. Error en una estación se loguea y sigue; run `ok=false` si falló alguna.
  - `runGapFill(db, fetcher)` = `runBackfill` con `days: 7`.
  - `main.ts`: `node dist/main.js <scrape|backfill|gapfill|probe>`; `probe` solo hace fetch y loguea status, bytes y cantidad de filas parseadas (sin base). `scrape` además corre `gapfill` si la hora UTC es 06 y minuto < 30. Exit code 1 ante error. Lee `DATABASE_URL`.

- [ ] **Step 1: Tests que fallan** (pglite + fetcher falso que devuelve los fixtures):

```ts
const r = await runScrape(db, async () => mainHtml);
expect(r.ok).toBe(true);
expect((await getStationBySlug(db, "victoria"))!.latest!.heightM).toBe(4.85);
// Review Focus 2
await expect(runScrape(db2, async () => { throw new Error("timeout"); })).rejects.toThrow();
expect((await getLastRuns(db2, 1))[0]).toMatchObject({ ok: false });
expect(await getSeries(db2, 260, T0, T1)).toEqual([]);
await expect(runScrape(db3, async () => "<html>Mantenimiento</html>")).rejects.toThrow();
// backfill
await runBackfill(db, async (u) => u.includes("historico") ? histHtml : mainHtml, { days: 365, stationIds: [260] });
expect((await getSeries(db, 260, new Date("2025-11-01"), new Date("2026-12-01"))).length).toBeGreaterThanOrEqual(715);
```

- [ ] **Step 2: Correr** → FAIL. **Step 3: Implementar.** **Step 4: Correr** → PASS.
- [ ] **Step 5: Probar `probe` local:** `npm run build -w apps/scraper && node apps/scraper/dist/main.js probe` → loguea status 200 y ~91 filas.
- [ ] **Step 6: Commit** `feat(scraper): jobs de scrape, backfill y gapfill`

---

### Task 5: Despliegue en Railway + prueba de bloqueo + backfill real

Tarea mayormente operativa. **Pedir OK al autor** antes de crear el repo público de GitHub y el proyecto de Railway.

**Files:**
- Create: `apps/scraper/railway.json` (`build` del workspace, `deploy.cronSchedule: "*/30 * * * *"`, `startCommand: "node apps/scraper/dist/main.js scrape"`, `restartPolicyType: "NEVER"`)

- [ ] **Step 1:** Con OK del autor: `gh repo create rio-victoria --public --source . --push`.
- [ ] **Step 2:** `railway login` (el autor lo corre con `! railway login` si hace falta), `railway init`, agregar Postgres, servicio scraper desde el repo con root del monorepo. Variable `DATABASE_URL` referenciada al Postgres.
- [ ] **Step 3 — prueba de bloqueo:** correr una vez `probe` en Railway (`railway run` no sirve: corre local; usar un deploy one-off con `startCommand` `probe` o `railway ssh`). Esperado: status 200 y ~91 filas en los logs. **Si falla (403, timeout, captcha):** detener, avisar al autor, e implementar el plan B del spec (endpoint `POST /api/internal/scrape` en Vercel protegido por `SCRAPE_SECRET`, que corre `runScrape`; el cron de Railway pasa a ser un `curl` a ese endpoint) como tarea extra antes de seguir.
- [ ] **Step 4:** Migraciones contra la base de Railway (`npx drizzle-kit migrate` con la URL pública) y backfill: `node apps/scraper/dist/main.js backfill` con la `DATABASE_URL` pública. Verificar: `select count(*) from readings where station_id=260` ≥ 715.
- [ ] **Step 5:** Activar el cron. Tras 1 h: `select * from scrape_runs order by id desc limit 3` → dos runs `ok=true`.
- [ ] **Step 6: Commit** `chore(scraper): config de railway`

---

### Task 6: Lógica de dominio

**Files:**
- Create/Modify: `packages/core/src/domain.ts`, `packages/core/src/stations.ts`
- Test: `packages/core/test/domain.test.ts`

**Interfaces:**
- Produces:
  - `type Level = 'normal' | 'alerta' | 'evacuacion' | 'sin-umbral'`; `levelOf(heightM, alertM | null, evacuationM | null): Level` — `sin-umbral` si falta cualquiera; `>= evacuationM` → evacuacion; `>= alertM` → alerta.
  - `type Trend = 'crece' | 'baja' | 'estable'`; `trendOf(heightM, prevHeightM | null): Trend` (|Δ| < 0.005 → estable).
  - `staleness(ts: Date, periodHours: number | null, now: Date): { stale: boolean; ageMs: number; limitHours: number }` — `limitHours = max(3 × (periodHours ?? 12), 6)`.
  - `thresholdsProgress(heightM, alertM, evacuationM): { toAlertM: number; toEvacuationM: number }` (positivos = falta).
  - `upstreamOf(station, all: Station[], n = 3): Station[]` — las `n` visibles del mismo río con `river_order` menor, más cercanas primero.
  - `describe(...)`: texto corto de estado, p. ej. `"Creciendo · faltan 5 cm para el nivel de evacuación de Prefectura"`; para `sin-umbral`: `"Creciendo"` solamente.

- [ ] **Step 1: Tests que fallan**

```ts
expect(levelOf(4.85, 4.6, 4.9)).toBe("alerta");
expect(levelOf(4.90, 4.6, 4.9)).toBe("evacuacion");
expect(levelOf(1.2, null, null)).toBe("sin-umbral");                       // Review Focus 5
const now = new Date("2026-11-18T19:40:00Z");
expect(staleness(new Date("2026-11-18T19:00:00Z"), 2, now).stale).toBe(false);
expect(staleness(new Date("2026-11-18T13:00:00Z"), 2, now).stale).toBe(true);   // 6h40m > 6h
expect(staleness(new Date("2026-11-18T09:00:00Z"), 12, now).stale).toBe(false); // límite 36h
expect(staleness(new Date("2026-11-15T15:00:00Z"), 12, now).stale).toBe(true);  // Review Focus 3
expect(thresholdsProgress(4.85, 4.6, 4.9).toEvacuationM).toBeCloseTo(0.05);
expect(upstreamOf(victoria, all).map(s => s.slug)).toEqual(["diamante", "santa-fe", "parana"]);
expect(describe({ heightM: 4.85, prevHeightM: 4.84, alertM: 4.6, evacuationM: 4.9 })).toBe("Creciendo · faltan 5 cm para el nivel de evacuación de Prefectura");
```

- [ ] **Step 2–4:** FAIL → implementar → PASS.
- [ ] **Step 5: Commit** `feat(core): niveles, tendencia, frescura y aguas arriba`

---

### Task 7: Identidad visual (gate con el autor)

Pedido explícito: "una buena identidad visual". Usar los skills `frontend-design:frontend-design` y `artifact-design`/Artifact para el mockup.

**Files:**
- Create: `apps/web/styles/tokens.css`, `apps/web/components/Logo.tsx`, `docs/identidad-visual.md`

- [ ] **Step 1:** Proponer al autor 2 direcciones distintas como mockups navegables (Artifact privado), ambas con datos reales del 18/11 (Victoria 4,85 m, alerta 4,60, evacuación 4,90) en pantalla de celular y en modo claro/oscuro. Cada una con: nombre/marca (p. ej. jugando con el río, las islas o el puente Rosario–Victoria; validar el nombre con el autor), logo simple en SVG, paleta, tipografía (Google Fonts), tratamiento del medidor y de la gráfica. Restricciones: contraste legible al sol (WCAG AA mínimo para texto), colores de alerta/evacuación distinguibles para daltonismo (no solo por color: también texto/ícono), no estética de dashboard genérico.
- [ ] **Step 2:** Esperar elección/ajustes del autor. **No avanzar a Task 9 sin dirección aprobada.**
- [ ] **Step 3:** Volcar la dirección elegida a `tokens.css` (variables CSS claro/oscuro), `Logo.tsx` y `docs/identidad-visual.md` (nombre, paleta con hex, tipografías, librería de gráficas elegida y por qué).
- [ ] **Step 4: Commit** `feat(web): identidad visual`

---

### Task 8: App web + API pública

**Files:**
- Create: `apps/web` (create-next-app, TypeScript, App Router, sin Tailwind salvo que la identidad lo pida), `apps/web/lib/data.ts`, `app/api/stations/route.ts`, `app/api/stations/[slug]/readings/route.ts`
- Test: `apps/web/test/api.test.ts` (Vitest llamando a los handlers con una base pglite inyectada vía `lib/data.ts`)

**Interfaces:**
- Consumes: repo y dominio de core.
- Produces:
  - `getDb(): Db` en `lib/data.ts` (singleton con `DATABASE_URL`; inyectable en tests con `setDbForTests(db)`).
  - `GET /api/stations` → `{ updatedAt, stations: [{ slug, name, river, heightM, ts, trend, level, alertM, evacuationM, stale }] }`, header `Cache-Control: public, s-maxage=300, stale-while-revalidate=600`, `Access-Control-Allow-Origin: *`.
  - `GET /api/stations/{slug}/readings?from=ISO&to=ISO` → `{ station, readings: [{ ts, heightM }] }`; default últimos 7 días; rango máx 3 años; slug inexistente → 404 JSON; fechas inválidas → 400.

- [ ] **Step 1: Tests que fallan:** `/api/stations` incluye `victoria` con `level: "alerta"`; `readings` de `no-existe` → 404; `from=basura` → 400; header de caché presente.
- [ ] **Step 2–4:** FAIL → implementar → PASS.
- [ ] **Step 5: Commit** `feat(web): api pública de alturas`

---

### Task 9: Páginas de puerto

**Files:**
- Create: `app/layout.tsx`, `app/page.tsx` (renderiza Victoria), `app/[slug]/page.tsx` (`revalidate = 300`, `notFound()` si no existe u oculto), `components/Hero.tsx`, `LevelGauge.tsx`, `HeightChart.tsx` (client), `Upstream.tsx`, `StationPicker.tsx`, `StaleBanner.tsx`, `SourceFooter.tsx`
- Test: `apps/web/test/components.test.tsx` (Vitest + Testing Library)

**Interfaces:**
- Consumes: tokens (Task 7), datos (Task 8), dominio (Task 6).

Contenido según el boceto del spec: altura grande, tendencia y variación, `describe()`, "actualizado hace X" (del `ts` de la lectura), barra alerta/evacuación (solo si hay umbrales), gráfica con rangos 7d/1m/6m/1a con eje temporal real y líneas de umbral, "Lo que viene de arriba" con `upstreamOf`, selector agrupado por río (Paraná, Delta Paraná, Gualeguay/Gualeguaychú/Ibicuy primero), footer de fuente.

- [ ] **Step 1: Tests que fallan:**
  - `Hero` con lectura stale → muestra `"Prefectura no publicó datos nuevos desde 15/11 12:00"` y no muestra "hace X" como si fuera actual.
  - `LevelGauge` con `alertM=null` → no renderiza nada (Review Focus 5).
  - Texto visible contiene "nivel de evacuación de Prefectura", nunca "evacuá" ni "evacuar" como imperativo.
  - `SourceFooter` tiene link a `contenidosweb.prefecturanaval.gob.ar/alturas/` y el texto "Sitio no oficial".
- [ ] **Step 2–4:** FAIL → implementar → PASS.
- [ ] **Step 5:** `npm run dev -w apps/web` con `DATABASE_URL` de Railway; revisar `/`, `/rosario`, `/campana` (sin umbrales), `/no-existe` (404) en viewport 390 px y desktop, claro y oscuro. Comparar con el mockup aprobado.
- [ ] **Step 6: Commit** `feat(web): páginas de puerto`

---

### Task 10: Vista previa para compartir, página de estado y deploy en Vercel

**Files:**
- Create: `app/opengraph-image.tsx`, `app/[slug]/opengraph-image.tsx`, `app/estado/page.tsx`

- [ ] **Step 1:** OG image (1200×630) con marca, puerto, altura, tendencia y **"Lectura del 18/11 16:00"** (del `ts`). Verificar en `/opengraph-image` local.
- [ ] **Step 2:** `/estado`: últimos 10 `scrape_runs` (hora ART, ok, insertadas, error) y antigüedad de la última lectura de Victoria.
- [ ] **Step 3:** Con OK del autor: `vercel link`, root `apps/web`, variable `DATABASE_URL` (URL pública de Railway con SSL), `vercel --prod`.
- [ ] **Step 4: Verificar en prod:** `curl -s https://<dominio>/api/stations | jq '.stations[] | select(.slug=="victoria")'` → altura igual a la de la tabla de Prefectura en ese momento (±1 run). Pegar el link en WhatsApp/Telegram y ver la vista previa.
- [ ] **Step 5: Commit** `feat(web): open graph, estado y deploy`

---

### Task 11: README de portfolio y cierre

**Files:**
- Create: `README.md`

- [ ] **Step 1:** README en castellano: qué es, captura, diagrama de arquitectura (el del spec), cómo corre el pipeline, API pública documentada con ejemplos `curl`, cómo correrlo local, decisiones técnicas (por qué tabla gana sobre historial, frescura por puerto), aviso de sitio no oficial y fuente.
- [ ] **Step 2:** `npm test && npm run typecheck` en la raíz → todo verde.
- [ ] **Step 3:** Revisar el consumo en el panel de Railway; anotar en el README el costo estimado/mes.
- [ ] **Step 4: Commit + push** `docs: readme`
