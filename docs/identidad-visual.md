# Identidad visual — "regla"

Elegida por el autor el 2026-11-18 entre dos direcciones (A "Regla", B "Aguas arriba").
Maquetas: https://claude.ai/artifact/4HWv6SuTpxS6ettcNCXuNG (privado).

## Idea

La regla hidrométrica — la escala pintada con "E" negras sobre blanco que se ve en los muelles — es el objeto con el que la gente del río lee la altura. La pantalla principal **es** una regla: el agua (marrón, como el Paraná) llega hasta la altura actual y las líneas de alerta y evacuación están pintadas sobre la escala.

## Nombre

**regla** (minúsculas). Se lee "la regla marca 4,85".

## Color

| Token | Claro | Oscuro | Uso |
|---|---|---|---|
| `--bg` | `#F3F6F8` | `#0E161C` | fondo (cielo frío, no crema) |
| `--ink` | `#14212B` | `#EEF2F4` | texto, marcas de la regla |
| `--muted` | `#4F5E69` | `#9DABB5` | texto secundario (≥ 4.5:1) |
| `--line` | `#D3DCE2` | `#2A3A45` | divisores, bordes |
| `--staff` | `#FFFFFF` | `#E6ECEF` | esmalte de la regla |
| `--water` | `#8B6640` | `#A67E52` | agua del Paraná, gráficas |
| `--alert` | `#B86E00` | `#F0A23B` | nivel de alerta (línea **punteada**) |
| `--evac` | `#C2182B` | `#FF5D6C` | nivel de evacuación (línea **continua**) |

Alerta y evacuación se distinguen también por trazo (punteado/continuo) y texto, no solo por color.

## Tipografía

**Archivo** (Google Fonts, variable en ancho y peso). Números grandes y títulos en `font-stretch: 62–75%`, peso 800 — tipo cartel de muelle. Texto corrido en ancho normal, 400–600.

## Gráficas

SVG propio, sin librería: son dos gráficos simples (regla y serie temporal) y así controlamos cada trazo. Eje temporal real (los puntos se ubican por fecha, no equiespaciados).
