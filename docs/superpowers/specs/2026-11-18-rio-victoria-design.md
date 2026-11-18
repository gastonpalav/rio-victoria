# Altura del río Paraná en Victoria — diseño

Fecha: 2026-11-18 · Estado: **aprobado por el autor (2026-11-18)**, con el pedido de "una buena identidad visual" (ver Interfaz → Identidad visual)

## Intención

Una web que muestre la altura del río Paraná en Victoria (Entre Ríos) de forma clara, vistosa e informativa, para la gente de Victoria y alrededores. La fuente es la tabla de alturas de Prefectura Naval, que tiene los datos pero es difícil de leer. Además funciona como pieza de portfolio del autor: el pipeline de datos, la base y la API tienen que estar prolijos y a la vista (repo público).

Contexto de arranque (18/11/2026 16:00): Victoria 4,85 m, creciendo, alerta 4,60 / evacuación 4,90.

## Objetivos

- Al entrar se ve Victoria: altura actual, si crece/baja/estable, variación, y cuánto falta para los niveles de alerta y evacuación de Prefectura, con colores claros.
- Gráfica con eje temporal real, rangos 7 días / 1 mes / 6 meses / 1 año (y más a medida que se acumule historia propia), con líneas de alerta y evacuación.
- "Lo que viene de arriba": estado de Santa Fe, Paraná y Diamante (y Hernandarias/La Paz como ampliación) en el mismo vistazo.
- Selector para ver cualquier otro puerto; Victoria es siempre el default.
- Mobile first (casi todo el tráfico va a ser desde celular), en castellano simple.
- API pública de lectura (JSON).

## No-objetivos

- Avisos/notificaciones (Telegram, push, mails). Descartado: solo se entra a mirar.
- Cuentas de usuario, favoritos en servidor.
- Pronósticos numéricos propios. Se muestra lo que pasa aguas arriba, no se inventa una predicción.

## Anti-objetivos (cosas que lo harían un fracaso aunque "funcione")

- Mostrar un dato viejo como si fuera actual. Con el río cerca de evacuación, eso es peligroso.
- Que parezca fuente oficial o que "evacuación" se lea como una orden. Es el nombre del umbral de Prefectura; se presenta como tal, con link a la fuente.
- Que se rompa sola en silencio (scraper caído, workflow desactivado) sin que nadie se entere.

## Lo que sabemos de la fuente (verificado con fetch crudo el 18/11/2026)

- Tabla principal: `https://contenidosweb.prefecturanaval.gob.ar/alturas/` — UTF-8, HTML server-rendered, 91 puertos (Paraná 31, Delta Paraná 14, Uruguay 25, Paraguay 6, De la Plata 5, Iguazú 4, Gualeguaychú 2, Gualeguay, Ibicuy, San Javier, Embalse Río Hondo).
  - Cada fila: `<th data-label="Puerto:">`, y `<td data-label="...">` para Río, Ultimo Registro, Variacion, Periodo (horas), Fecha Hora (`18/NOV/26 - 1600`), Estado (`ALERTA CRECE`, `EVACUACION ESTAC.`, `BAJA`…), Registro Anterior, Fecha Anterior, Alerta, Evacuación. El link Hist. trae el id del puerto (`id=260` Victoria, 230 Paraná, 240 Santa Fe, 250 Diamante, 270 San Lorenzo, 280 Rosario).
  - Los selectores por `data-label` son estables y cómodos; no depender de posiciones de columna.
- Historial: `/alturas/?page=historico&tiempo=N&id=ID` — `tiempo=365` devuelve **un año completo** (Victoria: 715 lecturas, 2025-11-18 → hoy). Valores mayores no traen más. Tabla con filas `2026-11-18 06:00` / `4.74 Mts`, más nuevas primero.
  - **El historial va atrasado** respecto de la tabla principal (a las 16:00 el historial terminaba en 06:00).
  - **Muestreo irregular**: hace un año ~2 lecturas/día, hoy cada 2 h.
- Horas: hora local argentina (UTC−3, sin horario de verano). Se guarda en UTC, se muestra en ART.
- Algunos puertos (Brasil) son caudales/cotas, con advertencia de unidades rara en la página: se guardan pero no se muestran como "altura" sin revisar.

## Enfoques considerados

1. **Next.js leyendo Prefectura en vivo con caché.** Lo más simple, pero sin historia propia y la web cae si cae Prefectura.
2. **Next.js + Postgres, con un proceso programado que guarda cada lectura.** Historia propia ilimitada, API pública, resiliencia ante caídas de la fuente, más valor de portfolio. Costo: una base que mantener.
3. **Git scraping: GitHub Action escribe JSON al repo, web estática.** Gratis y sin base; menos "backend" para mostrar.

**Elegido: 2**, con scraper (cron) y Postgres en **Railway** (el autor ya tiene Railway Pro) y la web en **Vercel Hobby**. Se descartó GitHub Actions como reloj: Railway no tiene el problema de desactivar workflows tras 60 días ni las demoras del cron de Actions, y deja el backend (scraper + base + logs) en un solo panel. El cron de Vercel Hobby no sirve (una vez por día). Nota: al proponerlo se dijo que Prefectura solo guarda 7 días; en realidad guarda 1 año. Igual se sostiene la 2 por: historia más allá de un año, la web no depende de que Prefectura esté arriba, API pública y valor de portfolio.

## Diseño

### Arquitectura

```
Railway
   ├─ servicio cron (cada 30 min): scraper Node/TS
   │     ├─ fetch tabla principal ─────────────► upsert en Postgres
   │     └─ (1 vez/día) historial 7 días/puerto ► relleno de huecos
   └─ Postgres (Railway)
Vercel (Hobby)
   └─ Next.js App Router
        ├─ páginas server-rendered, revalidación ~5 min, leyendo Postgres de Railway
        └─ /api/... endpoints JSON públicos
GitHub: solo código (monorepo); Railway y Vercel despliegan desde ahí.
```

- El backfill inicial (`tiempo=365` por puerto) es un comando del mismo scraper que se corre una vez.

- **Lecturas actuales** salen de la tabla principal. El historial solo se usa para el backfill inicial (`tiempo=365`, una vez por puerto) y para rellenar huecos.
- **Upsert por (puerto, timestamp)**: idempotente; correr dos veces no duplica.
- Umbrales de alerta/evacuación se guardan con cada scrape (pueden cambiar) — último valor por puerto en la tabla de puertos.

### Datos (borrador)

- `stations`: id de Prefectura, nombre, río, umbral alerta, umbral evacuación, orden aguas abajo (para "lo que viene de arriba"), si se muestra como altura.
- `readings`: station_id, ts (UTC), altura_m, fuente (`tabla` | `historial`), scraped_at. PK (station_id, ts).
- `scrape_runs`: inicio, fin, ok/error, filas nuevas — para el estado del pipeline.

### Frescura (anti-objetivo #1)

- "Actualizado hace X" se calcula con la **fecha de la lectura**, nunca con la hora del scrape.
- El umbral de "dato viejo" es **por puerto**: 3 × su período de reporte (columna Periodo de Prefectura), con mínimo de 6 h. Victoria (período 2 h) → 6 h; un puerto de 12 h → 36 h. Pasado el umbral, aviso visible: "Prefectura no publicó datos nuevos desde …". Así el aviso no aparece siempre en puertos que reportan poco y no se lo deja de mirar.
- La imagen Open Graph lleva la fecha/hora de la lectura, para que un link compartido viejo no muestre un número viejo como actual.

### Robustez del pipeline (anti-objetivo #3)

- **Riesgo: Prefectura bloquea las IPs de Railway.** Es lo primero que se prueba en la implementación. Plan B: el cron de Railway sigue siendo el reloj, pero llama a un endpoint protegido (secreto compartido) de Vercel que hace el fetch y el upsert desde la IP de Vercel. Plan C (solo transitorio): tarea programada en la PC del autor; como la PC puede estar apagada, el aviso de dato viejo cubre ese caso.
- Si el scrape falla, el proceso termina con código de error (Railway lo marca como fallido y puede notificar). El parser falla ruidosamente si cambia la estructura (no guarda basura). `scrape_runs` permite ver el estado; la web puede exponer un `/estado` simple.

### Interfaz (mobile first)

```
VICTORIA · Río Paraná          actualizado hace 40 min
  4,85 m   ▲ +1 cm en 2 h      CRECIENDO
  [■■■■■■■■■■■■■■■■■■■■■■■░]  ALERTA
   alerta 4,60 · evacuación 4,90 (niveles de Prefectura, faltan 5 cm)

  [7d] [1m] [6m] [1a]   gráfica con líneas de alerta/evacuación

  Lo que viene de arriba:
  Santa Fe 5,85 ▼ · Paraná 5,71 ▲ · Diamante 5,85 =

  [ cambiar de puerto ▾ ]
  Fuente: Prefectura Naval Argentina (link). Sitio no oficial.
```

- **Identidad visual (pedido explícito del autor):** tiene que tener una identidad propia y reconocible, no una plantilla genérica de dashboard. Nombre/marca, logo simple, paleta y tipografía propias, arraigadas en el lugar (el río, las islas del delta frente a Victoria, el puente Rosario–Victoria). Legible al sol en un celular, con modo claro y oscuro. La dirección concreta queda para el que construye, pero se propone al autor (mockup) antes de implementar toda la UI.
- Selector de puertos agrupado por río, con Paraná y Delta arriba y los ríos de Entre Ríos (Gualeguay, Gualeguaychú, Ibicuy) visibles.
- Ruta por puerto (`/victoria`, `/rosario`…) para poder compartir links; `/` es Victoria.
- Imagen de previsualización (Open Graph) con la altura actual, para que al compartir por WhatsApp ya se vea el número.

### API pública

- `GET /api/stations` — puertos con última lectura y umbrales.
- `GET /api/stations/{slug}/readings?from=&to=` — serie temporal.
- Con caché HTTP; documentada en el README.

## Decisiones del autor

- Público: gente de Victoria y alrededores. Victoria por defecto.
- Solo para mirar; sin avisos.
- Vistosa e informativa.
- Enfoque 2 (Postgres + proceso programado), recomendado y a confirmar con la aprobación de este documento.
- **Sin costo adicional**: Railway Pro (ya pago por el autor) para scraper y Postgres; Vercel Hobby para la web; GitHub para el código.

## Restricciones

- Sin costo extra: nada que requiera un plan nuevo. El consumo de Railway (cron chico + Postgres de decenas de MB) debe quedar dentro del crédito incluido en Pro; se verifica en el panel tras la primera semana.
- Vercel Hobby es para uso no comercial: si algún día se monetiza, hay que revisar esto.
- Volumen: ~400 mil lecturas/año con los 91 puertos, del orden de decenas de MB.

## Decisiones que tomé yo (corregibles)

- Stack: Next.js (App Router) + TypeScript en Vercel; scraper en Node/TS como cron de Railway; Postgres en Railway. Monorepo con web y scraper.
- Se scrapean los 91 puertos (es barato), la interfaz prioriza Paraná, Delta y ríos entrerrianos.
- Frecuencia del scraper: cada 30 min.
- Umbral de "dato viejo": por puerto, 3 × período de reporte, mínimo 6 h.
- Plan B ante bloqueo: fetch desde Vercel disparado por el cron de Railway; la PC solo como parche transitorio.
- Puertos de Brasil (caudal/cota) se guardan pero no se muestran en la interfaz.
- Si la tabla principal y el historial no coinciden para el mismo timestamp, gana la tabla principal.
- Nombre del proyecto/repo: `rio-victoria`. Ubicación local: `C:\Users\GastonPalavecino\rio-victoria`.

## Lo que queda para el que construye

- Librería de gráficas y dirección visual concreta (paleta, tipografía), dentro de "vistosa, clara, legible al sol en un celular".
- Detalle de la imagen Open Graph.
- Dominio (si se compra uno o queda en `*.vercel.app`).
