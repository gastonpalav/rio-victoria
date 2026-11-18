import { timingSafeEqual } from "node:crypto";

/** Compara "Bearer <token>" con el secreto sin filtrar tiempos. */
export function checkSecret(header: string | null, secret: string | undefined): boolean {
  if (!secret || !header?.startsWith("Bearer ")) return false;
  const a = Buffer.from(header.slice(7));
  const b = Buffer.from(secret);
  return a.length === b.length && timingSafeEqual(a, b);
}
