# Identidad visual — "regla"

Elegida por el autor el 2026-11-18 entre dos direcciones (A "Regla", B "Aguas arriba").
Maquetas: https://claude.ai/artifact/4HWv6SuTpxS6ettcNCXuNG (privado).

## Idea

La regla hidrométrica — la escala pintada con "E" negras sobre blanco que se ve en los muelles — es el objeto con el que la gente del río lee la altura. La pantalla principal **es** una regla: el agua (marrón, como el Paraná) llega hasta la altura actual y las líneas de alerta y evacuación están pintadas sobre la escala.

## Dirección actual: la pared de la costanera (2026-11-18, tercera vuelta)

El autor rechazó dos versiones por verse "típicas de IA/Claude". Investigación: Reuters (Colorado River) usa la línea del agua como la propia gráfica; FlowingData destaca que una línea de agua animada vuelve los números menos abstractos; GOV.UK insiste en que una altura sin contexto histórico no dice nada. Y un rasgo del Litoral: las marcas de crecientes pintadas a mano en las paredes.

- **La pantalla es una pared blanqueada a la cal** (grano sutil, `--wall` #E4E8E5), con la regla hidrométrica sobre el borde izquierdo.
- **La superficie del agua es la serie real** del período elegido (7 días, 1 mes, 6 meses, 1 año): a la izquierda el río de antes, a la derecha el de hoy. No hay gráfica aparte ni olas decorativas.
- **Marcas pintadas**: evacuación (roja, gruesa), alerta (ocre, punteada) y máximo del año (azul). La línea tiene trazo irregular (filtro SVG); **el texto nunca**, y va sobre fondo de cal por encima del número: una cifra de nivel no puede quedar ilegible.
- **"Lo que viene de arriba"**: reglas chicas lado a lado alineadas en su línea de evacuación, para comparar de un vistazo.
- **Tipografía**: Big Shoulders Stencil (lo pintado) + Atkinson Hyperlegible Next (texto, pensada para legibilidad).
- Fuera: píldoras, timeline de puntitos, párrafos de relleno, olas, bloques de color en el pie, modo oscuro.

## Nombre

**regla** (minúsculas). Se lee "la regla marca 4,85".

## Color

Siempre en claro. Cal fría `--wall` #E4E8E5, pintura azul marino `--paint` #12283A, agua café con leche `--river` #9C6E42 (superficie `--river-line` #5C3D20), evacuación `--evac-paint` #C0121F, alerta `--alert-paint` #A85F00. Sin crema ni terracota.

## Tipografía

Big Shoulders Stencil 800 para números, marcas y títulos; Atkinson Hyperlegible Next para el texto.

## Gráficas

SVG propio, sin librería: son dos gráficos simples (regla y serie temporal) y así controlamos cada trazo. Eje temporal real (los puntos se ubican por fecha, no equiespaciados).
