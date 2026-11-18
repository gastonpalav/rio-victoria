/**
 * Escala vertical de la pantalla principal: la pantalla es una regla de al menos SPAN_M metros.
 * Normalmente el agua ocupa ~60% de la altura y los niveles de Prefectura quedan visibles por encima.
 * Si el río está muy por debajo de los niveles, la regla se estira para que se vean el agua y las líneas.
 */
export const SPAN_M = 2.4;
const BELOW_SURFACE_M = 1.0;

export function heroScale(heightM: number, alertM: number | null, evacuationM: number | null) {
  const top = Math.ceil((Math.max(heightM, evacuationM ?? heightM) + 0.9) * 10) / 10;
  const bottom = Math.floor(Math.min(heightM - BELOW_SURFACE_M, top - SPAN_M) * 10) / 10;
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
