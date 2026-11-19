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

## Cuarta vuelta: la pared sigue debajo del agua (2026-11-19)

Auditoría "¿parece hecho con IA?": la pared estaba bien; lo genérico era todo lo de abajo (una columna de 720 px con título stencil, párrafo gris y contenido, repetida tres veces) y algunos detalles del agua.

- **Lo que viene de arriba**: las reglas van pegadas y el agua ocupa todo el ancho de cada columna, así el río forma un perfil escalonado de puerto en puerto, cortado por **una sola línea roja** (la evacuación de cada uno, alineada). Debajo: nombre, altura, diferencia corta ("+71 cm sobre evacuación") y días de viaje. "ACÁ" es un cartelito pintado sobre la regla propia.
- **Para comparar** son **marcas de creciente** pintadas a su altura real: HOY, HACE UN AÑO y ALERTA, con la diferencia escrita a lo largo de una flecha de medida. La escala se estira para que ningún rótulo pise la línea siguiente.
- **Viento**: una manga de viento vista desde arriba (norte arriba, apunta hacia donde sopla, se infla con la velocidad). Con sudestada la franja se pinta de ocre.
- **Pie**: "hecho en Victoria" pintado en stencil grande, sobre una franja azul marino.
- Todo lo de abajo va alineado a la izquierda con un margen propio (`--gutter`), a todo el ancho; nada de columna centrada.
- **Agua**: fuera el filtro de pincel (se veía como serrucho) y el grano de la cal (invisible). Vetas de corriente en un módulo grande para que no se lea la grilla. La cifra grande queda por delante de las líneas; los rótulos por delante de la cifra.
- **Río muy alto**: si un rótulo de nivel quedaría encima del texto del agua, se oculta (se mide en el navegador) y su valor se escribe en el agua. Lo mismo con el máximo del año en celular cuando cae detrás de la cifra.

## Nombre

**regla** (minúsculas). Se lee "la regla marca 4,85".

## Color

Siempre en claro. Cal fría `--wall` #E4E8E5, pintura azul marino `--paint` #12283A, agua café con leche `--river` #9C6E42 (superficie `--river-line` #5C3D20), evacuación `--evac-paint` #C0121F, alerta `--alert-paint` #A85F00. Sin crema ni terracota.

## Tipografía

Big Shoulders Stencil 800 para números, marcas y títulos; Atkinson Hyperlegible Next para el texto.

## Gráficas

SVG propio, sin librería: son dos gráficos simples (regla y serie temporal) y así controlamos cada trazo. Eje temporal real (los puntos se ubican por fecha, no equiespaciados).
