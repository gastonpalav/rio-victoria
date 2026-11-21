# regla — la altura del río Paraná en Victoria

**regla** muestra la altura del río Paraná en Victoria (Entre Ríos) y en los puertos de aguas arriba, con los datos que publica Prefectura Naval Argentina, en una página que se entiende de un vistazo desde el celular.

La pantalla principal es una **regla hidrométrica** — la escala pintada con "E" negras que se ve en los muelles — con el agua llegando hasta la altura actual y los niveles de alerta y evacuación de Prefectura marcados encima.

> Sitio no oficial. Los niveles de alerta y evacuación son los que publica Prefectura; ante una emergencia, seguí las indicaciones de Defensa Civil.

## Qué muestra

- Altura actual, si crece o baja, y cuánto falta para los niveles de Prefectura.
- "Hace cuánto" se calcula con la hora **de la lectura**, no la del sistema. Si un puerto deja de reportar, la página lo dice en vez de mostrar un dato viejo como actual (el umbral es por puerto: 3 × su período de reporte, mínimo 6 h).
- Gráfica de 7 días, 1 mes, 6 meses o 1 año, con eje de tiempo real.
- **Lo que viene de arriba**: Diamante, Santa Fe y Paraná, porque lo que pasa ahí llega a Victoria días después.
- **Cómo puede seguir**: una estimación propia a 1, 3 y 5 días, siempre como rango y con el error medido al lado (ver abajo).
- **Lo que pronostica el INA**: su pronóstico oficial de la altura promedio de las próximas 4 semanas, con la fecha de la corrida, en los 20 puertos que cubre.
- Los 89 puertos que publica Prefectura (`/rosario`, `/campana`, …).
- Vista previa para WhatsApp con la altura y la hora de la lectura.

## Arquitectura

```
Railway
 ├─ cron cada 30 min ──POST──┐        (Prefectura rechaza conexiones desde Railway)
 └─ Postgres ◄───────────────┼──────────────┐
                             ▼              │
Vercel (región gru1, San Pablo)             │
 ├─ /api/internal/scrape ── lee prefecturanaval.gob.ar ── upsert
 ├─ páginas server-rendered, caché 5 min, invalidada en cada scrape
 └─ API pública JSON
```

- **Monorepo** (npm workspaces): `packages/core` (parsers, esquema, consultas, reglas de negocio), `apps/scraper` (jobs y cron), `apps/web` (Next.js 16).
- **Parsers** sobre el HTML de Prefectura usando los atributos `data-label` (no posiciones de columna). Si la estructura cambia, el scrape falla ruidosamente y no guarda nada; una fila con "S/E" se saltea sin romper las demás.
- **Upsert idempotente** por `(puerto, hora)`. Cuando la tabla principal y el historial no coinciden, gana la tabla: el historial va atrasado.
- **Historia propia**: arrancó con el año que publica Prefectura y desde ahí se acumula sin límite.
- **Por qué la lectura corre en Vercel**: Prefectura no responde a las IPs de Railway; desde la región de San Pablo sí. El cron de Railway sólo dispara la ruta protegida.
- **El pronóstico del INA** se lee al cargar la página desde su API pública (`alerta.ina.gob.ar/a5`, modelo semanal 434), con caché de 1 h, y no se guarda. El INA identifica cada puerto con el id de Prefectura (`id_externo`). La corrida se pide filtrada por puerto, porque la serie no dice de qué puerto es, y tiene que venir exactamente una. No se muestra si la API falla o tarda más de 4 s, ni si la corrida tiene más de 10 días. Ojo: para algunos puertos el INA usa otros niveles que Prefectura (en Victoria, 5,90 m de evacuación contra 4,90 m). La página siempre compara con los de Prefectura y lo dice.

## La estimación

"Cómo puede seguir" no es un pronóstico oficial (esos los publica el [INA](https://www.ina.gob.ar/alerta/)). Es una cuenta chica, en `packages/core/src/forecast.ts`, sin dependencias:

- **Qué hace**: promedia dos estimaciones del cambio de altura. Una sigue la tendencia propia de los últimos 3 días. La otra es una regresión sobre lo que ya pasó en los puertos de arriba y todavía no llegó, usando el tiempo de viaje que sale de `travelDays`.
- **Cómo se prueba**: en cada carga, para cada día del último medio año, arma la estimación solo con lo que se sabía ese día y la compara con lo que después pasó. De esos errores salen el rango y el número que se publica.
- **Cuándo se calla**: si el dato del puerto es viejo, si no hay puertos de arriba con relación clara, si hay menos de ~8 meses de historia, o si a esa distancia no le gana a decir "queda igual que hoy" (por al menos 10%) y a seguir la tendencia.
- **De dónde parte**: del promedio de las últimas 24 h hasta la última lectura, no del día de calendario, para no arrancar de un dato viejo cuando el río se mueve rápido.

En Victoria, al 19/11/2026 (181 días de prueba): error medio de 1 cm a un día, 3 cm a tres y 4 cm a cinco; el río quedó dentro del rango el 78% de las veces. Con el río movido le erra más, y la página lo dice cuando pasa.

Límites conocidos: el año de historia tiene una sola creciente, así que con el río muy alto hay pocos casos para medir. Y la forma del modelo y el ancho del rango se eligieron mirando esos mismos ~180 días de prueba, así que los errores publicados son algo optimistas; la mejora sobre simplemente seguir la tendencia es modesta (del orden del 15%).

## API pública

Sin autenticación, con CORS abierto y caché de 5 minutos.

```bash
# Todos los puertos con su última lectura
curl https://<dominio>/api/stations

# Serie de Victoria (por defecto, últimos 7 días; máximo 3 años)
curl "https://<dominio>/api/stations/victoria/readings?from=2026-10-01&to=2026-11-18"
```

```json
{
  "slug": "victoria", "name": "Victoria", "river": "PARANA",
  "heightM": 4.85, "ts": "2026-11-18T19:00:00.000Z",
  "trend": "crece", "level": "alerta",
  "alertM": 4.6, "evacuationM": 4.9, "stale": false
}
```

`level` es `normal`, `alerta`, `evacuacion` o `sin-umbral`. Las horas van en UTC; Prefectura publica en hora argentina (UTC−3).

## Correrlo local

```bash
npm install
npm test                      # 150+ tests: parsers, base (PGlite), jobs, API, componentes

# Base: cualquier Postgres
export DATABASE_URL=postgres://...
npm start -- migrate          # aplica migraciones
npm start -- scrape           # lee Prefectura (necesita IP argentina o de la región gru1)
npm start -- backfill         # carga el último año de historial de todos los puertos

cd apps/web && npm run dev
```

## Variables de entorno

| Variable | Dónde | Para qué |
|---|---|---|
| `DATABASE_URL` | Vercel, local | Postgres (en Vercel, la URL pública del TCP proxy de Railway) |
| `SCRAPE_SECRET` | Vercel y Railway | clave compartida para `POST /api/internal/scrape` |
| `SCRAPE_URL` | Railway | `https://<dominio>/api/internal/scrape` |
| `SITE_URL` | Vercel (opcional) | URL base para las imágenes de vista previa |
| `REPO_URL` | opcional | se agrega al User-Agent del scraper |

El servicio de Railway corre `npm start -- trigger` (ver `railway.json`) cada 30 minutos: dispara la lectura en Vercel y, a las 06 UTC, también el relleno de huecos con el historial.

## Stack

TypeScript · Next.js 16 (App Router, Cache Components) · Drizzle ORM · Postgres · cheerio · Vitest + PGlite · Railway · Vercel.

Datos: [Prefectura Naval Argentina](https://contenidosweb.prefecturanaval.gob.ar/alturas/).
