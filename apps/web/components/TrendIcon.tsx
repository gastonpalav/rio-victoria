export function TrendIcon({ trend, size = 22 }: { trend: "crece" | "baja" | "estable"; size?: number }) {
  const d = trend === "crece" ? "M12 19V5M5 12l7-7 7 7" : trend === "baja" ? "M12 5v14M5 12l7 7 7-7" : "M5 12h14";
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.6} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d={d} />
    </svg>
  );
}
