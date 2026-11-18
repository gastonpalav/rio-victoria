/**
 * Escala vertical de la pantalla principal: la pantalla es una regla de al menos SPAN_M metros.
 * Normalmente el agua ocupa ~60% de la altura y los niveles de Prefectura quedan visibles por encima.
 * Si el río está muy por debajo de los niveles, la regla se estira para que se vean el agua y las líneas.
 */
export const SPAN_M = 2.4;
const BELOW_SURFACE_M = 1.0;
const MIN_LEVEL = 0.42;

/** `lowestM`: lo más bajo que se va a dibujar (p. ej. la serie del período); la escala lo deja dentro de la pantalla. */
export function heroScale(heightM: number, alertM: number | null, evacuationM: number | null, lowestM = heightM) {
  const top = Math.ceil((Math.max(heightM, evacuationM ?? heightM) + 0.9) * 10) / 10;
  // Abajo: lo más bajo del período con margen, al menos SPAN_M metros de regla, y el agua en ≥ MIN_LEVEL de la pantalla
  // (dentro del agua va el texto; si el río está muy por debajo de los niveles, la regla se estira hacia abajo).
  const forLevel = (heightM - MIN_LEVEL * top) / (1 - MIN_LEVEL);
  const bottom =
    Math.floor(Math.min(Math.min(heightM, lowestM) - BELOW_SURFACE_M * 0.6, heightM - BELOW_SURFACE_M, top - SPAN_M, forLevel) * 10) / 10;
  const span = top - bottom;
  /** 0 = fondo de la pantalla, 1 = arriba de todo. */
  const pos = (h: number) => Math.min(1, Math.max(0, (h - bottom) / span));
  return {
    top,
    bottom,
    span,
    level: pos(heightM),
    alert: alertM === null ? null : pos(alertM),
    evacuation: evacuationM === null ? null : pos(evacuationM),
    pos,
  };
}
