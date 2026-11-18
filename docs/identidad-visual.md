# Identidad visual — "regla"

Elegida por el autor el 2026-11-18 entre dos direcciones (A "Regla", B "Aguas arriba").
Maquetas: https://claude.ai/artifact/4HWv6SuTpxS6ettcNCXuNG (privado).

## Idea

La regla hidrométrica — la escala pintada con "E" negras sobre blanco que se ve en los muelles — es el objeto con el que la gente del río lee la altura. La pantalla principal **es** una regla: el agua (marrón, como el Paraná) llega hasta la altura actual y las líneas de alerta y evacuación están pintadas sobre la escala.

## Rediseño (2026-11-18): la pantalla es la regla

Pedido del autor: sacar lo genérico y hacerla vistosa. La regla dejó de ser un dibujo al costado:

- **Portada**: el cielo arriba; el agua marrón llena la pantalla desde abajo hasta la altura real (sube al cargar). La escala con las "E" va pintada sobre todo el borde izquierdo. Las líneas de alerta (punteada) y evacuación (continua) cruzan la pantalla de lado a lado. El número gigante flota sobre la superficie.
- **Al bajar te sumergís**: cada sección es más honda (`--river-2` → `--river-3` → `--river-bed`). La gráfica está bajo el agua en arena; "lo que viene de arriba" es una línea de río que baja hasta el puerto que mirás.
- La escala se estira si el río está muy por debajo de los niveles, para que siempre se vean el agua y las líneas (`lib/scale.ts`).

## Nombre

**regla** (minúsculas). Se lee "la regla marca 4,85".

## Color

Cielo (cambia con claro/oscuro): `--sky` #CFDDE4 / #0A1319, tinta `--sky-ink` #10202A / #E9EEF1.
Río (igual en ambos modos, cada vez más hondo): `--river` #7A5533, `--river-2` #5E3F24, `--river-3` #46301C, `--river-bed` #2B1E12; texto `--on-river` #FFF3E2, `--sand` #F2C98A para gráficas y el puerto actual.
Niveles: alerta ámbar (punteada), evacuación roja (continua) — distintos también por trazo y texto.

## Tipografía

**Archivo** (Google Fonts, variable en ancho y peso). Números grandes y títulos en `font-stretch: 62–75%`, peso 800 — tipo cartel de muelle. Texto corrido en ancho normal, 400–600.

## Gráficas

SVG propio, sin librería: son dos gráficos simples (regla y serie temporal) y así controlamos cada trazo. Eje temporal real (los puntos se ubican por fecha, no equiespaciados).
