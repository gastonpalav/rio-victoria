/** Marca "regla": una regla hidrométrica (E) con el agua llegando. */
export function Logo({ size = 30 }: { size?: number }) {
  const w = (size * 22) / 30;
  return (
    <span className="logo">
      <svg width={w} height={size} viewBox="0 0 22 30" aria-hidden="true">
        <rect x="0" y="0" width="5" height="30" fill="var(--ink)" />
        <rect x="5" y="2" width="12" height="3" fill="var(--ink)" />
        <rect x="5" y="8" width="12" height="3" fill="var(--ink)" />
        <rect x="5" y="14" width="12" height="3" fill="var(--ink)" />
        <rect x="0" y="21" width="22" height="9" fill="var(--water)" />
      </svg>
      <span className="logo-word">regla</span>
    </span>
  );
}
