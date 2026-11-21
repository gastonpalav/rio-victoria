# El pronóstico del INA — Plan de implementación

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** En cada puerto que cubre el INA, mostrar después de "Cómo puede seguir" su pronóstico oficial de la altura promedio de las próximas 4 semanas.

**Architecture:** `apps/web/lib/ina.ts` pide a la API pública del INA (lista de puertos + última corrida del modelo semanal) y la convierte en un mapa id de Prefectura → semanas. `lib/data.ts` lo cachea 1 h con `"use cache"`, igual que el viento. Un componente nuevo, `InaForecast`, lo muestra; si no hay datos, no aparece. No se toca la base.

**Tech Stack:** Next.js 16 (App Router, `"use cache"`), React, TypeScript, Vitest + Testing Library.

**Spec:** `docs/superpowers/specs/2026-11-21-pronostico-ina-design.md`

## Global Constraints

- API: `https://alerta.ina.gob.ar/a5`. Puertos: `GET /obs/puntual/estaciones?tabla=alturas_prefe`. Corrida: `GET /sim/calibrados/434/corridas/last?includeProno=true`.
- Cruce: `estacion.id_externo` del INA (string) = id de Prefectura = `stations.id` en nuestra base. La serie de la corrida trae `estacion_id` = `id` del INA.
- Timeout 4 s por pedido; cualquier falla → `null`, sin error en la página.
- Caché 1 h (`cacheLife({ stale: 300, revalidate: 3600, expire: 7200 })`).
- Se muestran hasta **4 semanas** con `timeend > ahora`. Si la corrida (`forecast_date`) tiene más de **10 días**, no se muestra nada.
- Un número solo si `fmtM(lo) === fmtM(hi)`; si no, "lo a hi".
- Nunca dar órdenes: las notas de nivel describen ("llega al nivel de…", "por encima del nivel de…"), igual que `forecastLevelNote`.
- Fechas en hora argentina (UTC−3). El INA usa `03:00Z` = medianoche en Argentina; `timeend` es exclusivo.
- Textos en castellano rioplatense, como el resto del sitio.

## Review Focus

1. **Fechas en UTC en vez de hora argentina:** en un servidor en UTC, `2026-11-20T03:00Z` tiene que seguir siendo "20 nov", y una semana que termina en `2026-11-27T03:00Z` se muestra hasta el **26**. Test en Task 2.
2. **La API devuelve HTML, `{}`, un array vacío o una serie sin `pronosticos`:** la página se ve igual, sin la sección. Tests en Task 1.
3. **Puerto que el INA no cubre** (por ejemplo, uno del río Uruguay que no está en la corrida): no aparece la sección y el link al INA vuelve al final de "Cómo puede seguir". Tests en Task 1 y Task 3.
4. **`min` mayor que `max`, o solo viene `main`:** `lo = min(valores)`, `hi = max(valores)`; con solo `main`, lo = hi = main. Test en Task 1.
5. **Corrida de hace 11 días:** no se muestra nada aunque tenga semanas por delante. Test en Task 1.

---

### Task 1: Leer el INA (`lib/ina.ts`) y cachearlo

**Files:**
- Create: `apps/web/lib/ina.ts`
- Create: `apps/web/test/fixtures/ina-estaciones.json`, `apps/web/test/fixtures/ina-corrida.json`
- Create: `apps/web/test/ina.test.ts`
- Modify: `apps/web/lib/data.ts` (agregar `getInaForecasts`; `getStationPage` devuelve además `prefectureId: here.id`)

**Interfaces:**
- Produces:
  ```ts
  export type InaWeek = { start: string; end: string; loM: number; hiM: number }; // ISO UTC, end exclusivo
  export type InaForecast = { runDate: string; weeks: InaWeek[] };                 // runDate ISO
  export type InaAll = Record<number, InaForecast>;                                // clave: id de Prefectura
  export const INA_API = "https://alerta.ina.gob.ar/a5";
  export function parseIna(stations: unknown, run: unknown): InaAll | null;
  export function inaFor(all: InaAll | null, prefectureId: number, now: Date): InaForecast | null;
  export async function fetchIna(): Promise<InaAll | null>;
  // data.ts
  export async function getInaForecasts(): Promise<InaAll | null>;
  ```

- [ ] **Step 1: Guardar los fixtures reales, recortados a 3 puertos**

```bash
cd apps/web && mkdir -p test/fixtures
curl -s "https://alerta.ina.gob.ar/a5/obs/puntual/estaciones?tabla=alturas_prefe" | node -e 'let d="";process.stdin.on("data",c=>d+=c).on("end",()=>{const j=JSON.parse(d).filter(e=>[29,31,32].includes(e.id)).map(({id,nombre,id_externo,tabla})=>({id,nombre,id_externo,tabla}));require("fs").writeFileSync("test/fixtures/ina-estaciones.json",JSON.stringify(j,null,1))})'
curl -s "https://alerta.ina.gob.ar/a5/sim/calibrados/434/corridas/last?includeProno=true" | node -e 'let d="";process.stdin.on("data",c=>d+=c).on("end",()=>{const j=JSON.parse(d);j.series=j.series.filter(s=>[29,31,32].includes(s.estacion_id));require("fs").writeFileSync("test/fixtures/ina-corrida.json",JSON.stringify(j,null,1))})'
```

Esperado: Paraná (INA 29 → Prefectura 230), Diamante (31 → 250) y Victoria (32 → 260). Anotá la `forecast_date` y los valores de Victoria que quedaron; los tests de abajo usan los de la corrida del 20/11/2026 (`forecast_date` `2026-11-20T03:00:00.000Z`; semana 20–27/11 main 5,16; 27/11–4/12 main 5,38, min 5,37, max 5,39; 4–11/12 min 5,30, max 5,43; 11–18/12 min 5,47, max 5,74). Si la corrida guardada es otra, ajustá los valores esperados a los del fixture.

- [ ] **Step 2: Escribir los tests que fallan** (`apps/web/test/ina.test.ts`)

```ts
const all = parseIna(estaciones, corrida)!;
const now = new Date("2026-11-21T15:00:00Z");

it("cruza por id de Prefectura y arma las semanas con rango", () => {
  const v = all[260]!;
  expect(v.runDate).toBe("2026-11-20T03:00:00.000Z");
  expect(v.weeks.find((w) => w.start === "2026-11-27T03:00:00.000Z")).toEqual({
    start: "2026-11-27T03:00:00.000Z", end: "2026-12-04T03:00:00.000Z", loM: 5.37, hiM: 5.39 });
});
it("inaFor descarta semanas terminadas y deja como mucho 4", () => {
  const f = inaFor(all, 260, now)!;
  expect(f.weeks).toHaveLength(4);
  expect(f.weeks[0]!.start).toBe("2026-11-20T03:00:00.000Z"); // la semana 13–20 ya terminó
});
it("con una corrida de más de 10 días no muestra nada", () => {
  expect(inaFor(all, 260, new Date("2026-12-01T04:00:00Z"))).toBeNull(); // 11 días
  expect(inaFor(all, 260, new Date("2026-11-29T15:00:00Z"))).not.toBeNull();
});
it("puerto que el INA no cubre → null", () => expect(inaFor(all, 999, now)).toBeNull());
it("sin semanas por delante → null", () => expect(inaFor(all, 260, new Date("2027-01-16T00:00:00Z"))).toBeNull());
it("solo main → lo = hi; min > max se ordena", () => {
  const run = { forecast_date: "2026-11-20T03:00:00.000Z", series: [{ estacion_id: 32, pronosticos: [
    { timestart: "2026-11-20T03:00:00.000Z", timeend: "2026-11-27T03:00:00.000Z", valor: 5.16, qualifier: "main" },
    { timestart: "2026-11-27T03:00:00.000Z", timeend: "2026-12-04T03:00:00.000Z", valor: 5.5, qualifier: "min" },
    { timestart: "2026-11-27T03:00:00.000Z", timeend: "2026-12-04T03:00:00.000Z", valor: 5.2, qualifier: "max" }]}] };
  const w = parseIna(estaciones, run)![260]!.weeks;
  expect(w[0]).toMatchObject({ loM: 5.16, hiM: 5.16 });
  expect(w[1]).toMatchObject({ loM: 5.2, hiM: 5.5 });
});
it("respuestas rotas → null, sin tirar error", () => {
  for (const bad of [null, "<html>", {}, [], { series: "x" }]) expect(parseIna(estaciones, bad)).toBeNull();
  expect(parseIna("<html>", corrida)).toBeNull();
});
it("una serie sin pronósticos no rompe las demás", () => {
  const run = { ...corrida, series: [{ estacion_id: 31, pronosticos: [] }, ...corrida.series.filter((s: { estacion_id: number }) => s.estacion_id === 32)] };
  const r = parseIna(estaciones, run)!;
  expect(r[260]).toBeDefined();
  expect(r[250]).toBeUndefined(); // Diamante, sin semanas: no figura
});
```

(Ids verificados el 21/11: Paraná 230, Diamante 250, Victoria 260.)

- [ ] **Step 3: Correr y ver que fallan**

Run: `npm test -w apps/web -- ina` → FAIL (no existe `@/lib/ina`).

- [ ] **Step 4: Implementar `lib/ina.ts`**

- `parseIna`: si `stations` no es array, o `run` no tiene `forecast_date` string y `series` array → `null`. Mapa INA id → `Number(id_externo)` (salteá los que no dan número finito). Por serie: agrupá `pronosticos` por `timestart`; valores numéricos finitos; `lo`/`hi` = mín/máx de los valores del grupo; ordená por `start`. Serie sin semanas válidas o sin cruce → no figura. Redondeá a cm (`Math.round(x * 100) / 100`).
- `inaFor`: `null` si `all` es `null`, si falta el puerto, si `now - runDate > 10 días` o si no queda ninguna semana con `end > now`; si no, hasta 4 semanas.
- `fetchIna`: los dos pedidos en paralelo, cada uno con `AbortSignal.timeout(4000)`; `!res.ok` o excepción → `null`; si no, `parseIna`.
- En `data.ts`: `getInaForecasts()` con `"use cache"` y `cacheLife({ stale: 300, revalidate: 3600, expire: 7200 })`, sin `cacheTag` (no depende del scrape). `getStationPage` agrega `prefectureId: here.id` al objeto que devuelve.

- [ ] **Step 5: Correr los tests y el typecheck**

Run: `npm test -w apps/web -- ina` → PASS. Run: `npm run typecheck -w apps/web` → sin errores.

- [ ] **Step 6: Commit**

```bash
git add apps/web/lib/ina.ts apps/web/lib/data.ts apps/web/test/ina.test.ts apps/web/test/fixtures/ina-*.json
git commit -m "feat(web): leer el pronóstico semanal del INA"
```

---

### Task 2: Los textos (`lib/copy.ts`)

**Files:**
- Modify: `apps/web/lib/copy.ts`
- Test: `apps/web/test/copy.test.ts`

**Interfaces:**
- Consumes: `InaWeek` (Task 1).
- Produces:
  ```ts
  export function inaWeekLabel(w: { start: string; end: string }): string;   // "20 al 26 nov", "27 nov al 3 dic"
  export function inaRunLabel(runDate: string): string;                       // "20/11"
  export function inaLevelNote(w: { loM: number; hiM: number }, s: { alertM: number | null; evacuationM: number | null }): string | null;
  ```

- [ ] **Step 1: Escribir los tests que fallan**

```ts
describe("inaWeekLabel", () => {
  it("en hora argentina y con el último día incluido", () => {
    expect(inaWeekLabel({ start: "2026-11-20T03:00:00.000Z", end: "2026-11-27T03:00:00.000Z" })).toBe("20 al 26 nov");
    expect(inaWeekLabel({ start: "2026-11-27T03:00:00.000Z", end: "2026-12-04T03:00:00.000Z" })).toBe("27 nov al 3 dic");
    expect(inaWeekLabel({ start: "2026-12-25T03:00:00.000Z", end: "2027-01-01T03:00:00.000Z" })).toBe("25 al 31 dic");
  });
});
it("inaRunLabel", () => expect(inaRunLabel("2026-11-20T03:00:00.000Z")).toBe("20/11"));
describe("inaLevelNote", () => {
  const s = { alertM: 4.6, evacuationM: 5.9 };
  it("describe sin ordenar, primero evacuación", () => {
    expect(inaLevelNote({ loM: 5.3, hiM: 5.43 }, s)).toBe("por encima del nivel de alerta (4,60 m)");
    expect(inaLevelNote({ loM: 4.5, hiM: 4.7 }, s)).toBe("llega al nivel de alerta (4,60 m)");
    expect(inaLevelNote({ loM: 5.8, hiM: 5.99 }, s)).toBe("llega al nivel de evacuación (5,90 m)");
    expect(inaLevelNote({ loM: 4.0, hiM: 4.2 }, s)).toBeNull();
    expect(inaLevelNote({ loM: 5, hiM: 5 }, { alertM: null, evacuationM: null })).toBeNull();
  });
});
```

- [ ] **Step 2: Correr y ver que fallan**

Run: `npm test -w apps/web -- copy` → FAIL.

- [ ] **Step 3: Implementar.** Fechas: restá 3 h y usá los getters `getUTC*` (como `dayLabel`); el último día es `end − 3 h − 1 ms`. Meses abreviados `ene feb mar abr may jun jul ago sep oct nov dic`; si inicio y fin están en el mismo mes, el mes va una sola vez. `inaLevelNote`: recorré evacuación y después alerta; `lo >= m` → "por encima del nivel de X (m m)", `hi >= m` → "llega al nivel de X (m m)", con `fmtM`.

- [ ] **Step 4: Correr los tests**

Run: `npm test -w apps/web -- copy` → PASS. Para confirmar que no depende de la zona horaria de la máquina: `TZ=Asia/Tokyo npm test -w apps/web -- copy` → PASS.

- [ ] **Step 5: Commit**

```bash
git add apps/web/lib/copy.ts apps/web/test/copy.test.ts
git commit -m "feat(web): textos del pronóstico del INA"
```

---

### Task 3: La sección en la página

**Files:**
- Create: `apps/web/components/InaForecast.tsx`
- Modify: `apps/web/components/StationView.tsx`, `apps/web/components/Forecast.tsx` (línea del link al INA al final), `apps/web/app/globals.css`
- Test: `apps/web/test/components.test.tsx`

**Interfaces:**
- Consumes: `InaForecast`, `inaFor`, `INA_API` (Task 1); `getInaForecasts`, `prefectureId` de `getStationPage` (Task 1); `inaWeekLabel`, `inaRunLabel`, `inaLevelNote` (Task 2).
- Produces: `export function InaForecast({ ina, station }: { ina: InaForecast | null; station: StationDto })` (componente de servidor, sin `"use client"`); `Forecast` gana la prop opcional `inaShown?: boolean` (por defecto `false`, así los tests que ya existen no cambian).

- [ ] **Step 1: Escribir los tests que fallan** (en `components.test.tsx`, con `victoria` y un `InaForecast` armado a mano con las 4 semanas de la corrida del 20/11)

```ts
describe("InaForecast", () => {
  it("muestra las semanas, la fecha de la corrida y el link", () => {
    render(<InaForecast ina={ina} station={victoria} />);
    const t = document.body.textContent!;
    expect(screen.getByRole("heading", { name: "Lo que pronostica el INA" })).toBeTruthy();
    expect(t).toContain("corrida del 20/11");
    expect(t).toContain("20 al 26 nov");
    expect(t).toContain("5,16 m");
    expect(t).toContain("5,30 a 5,43 m");
    expect(t).toContain("no el pico");
    expect(screen.getByRole("link", { name: /Instituto Nacional del Agua/ }).getAttribute("href")).toBe("https://www.ina.gob.ar/alerta/");
    expect(t).not.toMatch(/evacu(á|ar|en)\b/i);
  });
  it("sin datos no muestra nada", () => {
    const { container } = render(<InaForecast ina={null} station={victoria} />);
    expect(container.innerHTML).toBe("");
  });
});
it("Forecast: el link al INA vuelve al final solo si no se muestra el bloque del INA", () => {
  // `forecast` y `fresh` ya existen en este archivo
  render(<Forecast forecast={forecast} station={fresh} />);
  expect(document.body.textContent).toContain("Los pronósticos oficiales del Paraná los publica");
  cleanup();
  render(<Forecast forecast={forecast} station={fresh} inaShown />);
  expect(document.body.textContent).not.toContain("Los pronósticos oficiales del Paraná los publica");
});
```

- [ ] **Step 2: Correr y ver que fallan**

Run: `npm test -w apps/web -- components` → FAIL.

- [ ] **Step 3: Implementar**

- `InaForecast`: `<section className="forecast ina" aria-labelledby=…>` con `<h2>Lo que pronostica el INA</h2>`, una marca "oficial", la bajada "Altura promedio de cada semana · corrida del {inaRunLabel}", una lista `<ol>` con una fila por semana (fecha · valor · nota de nivel si hay) y al pie: "Es el promedio de cada semana, no el pico. La estimación de arriba es el promedio de cada día. Pronóstico completo en el [Instituto Nacional del Agua](https://www.ina.gob.ar/alerta/)." Si `ina` es `null` → `null`.
- `StationView`: `const ina = inaFor(await getInaForecasts(), page.prefectureId, new Date())` (en paralelo con `getWind`); `<InaForecast ina={ina} station={station} />` justo después de `<Forecast … inaShown={ina !== null} />`.
- `Forecast`: el último `<p className="forecast-proof">` con el link al INA se muestra solo si `!inaShown`.
- CSS: reusá `.forecast` y `.forecast-proof`; agregá lo mínimo para la tabla de semanas y la marca "oficial", con los tokens de `styles/tokens.css`. En el celular, cada fila entra en una línea o baja la nota de nivel abajo, sin scroll horizontal.

- [ ] **Step 4: Correr todo**

Run: `npm test` → PASS. Run: `npm run typecheck` → sin errores. Run: `npm run lint -w apps/web` → sin errores.

- [ ] **Step 5: Mirarlo en el navegador**

Run: `npm run dev -w apps/web` (usa `.env.local`). Abrí `/victoria` en ancho de celular (390 px) y de escritorio: la sección aparece debajo de "Cómo puede seguir", con 4 semanas y sin desbordar. Abrí un puerto del río Uruguay: la sección no aparece y el link al INA vuelve a "Cómo puede seguir".

- [ ] **Step 6: Commit**

```bash
git add apps/web/components apps/web/app/globals.css apps/web/test/components.test.tsx
git commit -m "feat(web): el pronóstico del INA al lado de la estimación"
```

---

### Task 4: README, y probar que responde desde Vercel

**Files:**
- Modify: `README.md`

- [ ] **Step 1: README.** En "Qué muestra", una línea: "**Lo que pronostica el INA**: su pronóstico oficial de la altura promedio de las próximas 4 semanas, con la fecha de la corrida." En "Arquitectura", que el INA se lee al cargar la página (API pública `alerta.ina.gob.ar/a5`, modelo semanal 434), con caché de 1 h, y no se muestra si falla o si la corrida tiene más de 10 días.

- [ ] **Step 2: Commit**

```bash
git add README.md
git commit -m "docs: el pronóstico del INA en el readme"
```

- [ ] **Step 3: Probar desde Vercel (gru1).** Hay que desplegar, y eso lo decide el autor: pedile que pushee o que despliegue una preview. Después abrí `/victoria` en el deploy. Si la sección aparece, el INA responde desde Vercel. Si no aparece y en local sí, el INA bloquea a Vercel: avisale al autor antes de seguir. La página igual queda bien, porque el bloque falla en silencio.
