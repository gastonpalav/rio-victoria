/** Puertos que Prefectura publica pero no son alturas comparables (caudales/cotas de Brasil). */
export const HIDDEN_STATIONS = ["GUAYRA", "REPRESA ITAIPU", "CAIXA", "CAXIA", "CAPANEMA"];

export function isHidden(name: string): boolean {
  const n = name.toUpperCase();
  return n.includes("BRASIL") || HIDDEN_STATIONS.some((h) => n.includes(h));
}
