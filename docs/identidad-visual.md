# Identidad visual — "regla"

Elegida por el autor el 2026-11-18 entre dos direcciones (A "Regla", B "Aguas arriba").
Maquetas: https://claude.ai/artifact/4HWv6SuTpxS6ettcNCXuNG (privado).

## Idea

La regla hidrométrica — la escala pintada con "E" negras sobre blanco que se ve en los muelles — es el objeto con el que la gente del río lee la altura. La pantalla principal **es** una regla: el agua (marrón, como el Paraná) llega hasta la altura actual y las líneas de alerta y evacuación están pintadas sobre la escala.

## Rediseño (2026-11-18): la pantalla es la regla

Pedido del autor: sacar lo genérico y hacerla vistosa. La regla dejó de ser un dibujo al costado:

- **Portada**: el cielo arriba; el agua marrón llena la pantalla desde abajo hasta la altura real (sube al cargar). La escala con las "E" va pintada sobre todo el borde izquierdo. Las líneas de alerta (punteada) y evacuación (continua) cruzan la pantalla de lado a lado. El número gigante flota sobre la superficie.
- **Debajo**: secciones claras con el río como acento; "lo que viene de arriba" es una línea de río que baja hasta el puerto que mirás. El pie, azul marino.
- La escala se estira si el río está muy por debajo de los niveles, para que siempre se vean el agua y las líneas (`lib/scale.ts`).

## Nombre

**regla** (minúsculas). Se lee "la regla marca 4,85".

## Color

**Siempre en claro** (pedido del autor, 2026-11-18): no sigue el modo oscuro del sistema. Nada de crema ni terracota.

- Cielo de día, degradé hacia el horizonte: `--sky-top` #9FD3EE → `--sky` #CFEAF7 → `--sky-horizon` #EEF8FD. Tinta azul marino `--sky-ink` #0B2233.
- Agua café con leche del Paraná: `--river` #9A6B3E → `--river-2` #7E5530, texto `--on-river` #FFF8EE.
- Secciones de abajo en blanco frío (`--paper` #F5FAFD, `--paper-2` #E7F1F7) con el río como acento; pie azul marino `--navy`.
- Niveles: alerta ámbar (punteada), evacuación roja (continua), distintos también por trazo y texto.

## Tipografía

**Archivo** (Google Fonts, variable en ancho y peso). Números grandes y títulos en `font-stretch: 62–75%`, peso 800 — tipo cartel de muelle. Texto corrido en ancho normal, 400–600.

## Gráficas

SVG propio, sin librería: son dos gráficos simples (regla y serie temporal) y así controlamos cada trazo. Eje temporal real (los puntos se ubican por fecha, no equiespaciados).
