"use client";
import { useRouter } from "next/navigation";

type Option = { slug: string; name: string; river: string };

const RIVER_ORDER = ["PARANA", "DELTA PARANA", "GUALEGUAY", "GUALEGUAYCHU", "IBICUY"];
const RIVER_LABEL: Record<string, string> = {
  PARANA: "Río Paraná",
  "DELTA PARANA": "Delta del Paraná",
  GUALEGUAY: "Río Gualeguay",
  GUALEGUAYCHU: "Río Gualeguaychú",
  IBICUY: "Río Ibicuy",
  URUGUAY: "Río Uruguay",
  PARAGUAY: "Río Paraguay",
  "DE LA PLATA": "Río de la Plata",
  IGUAZU: "Río Iguazú",
  "SAN JAVIER": "Río San Javier",
};

export function groupByRiver(options: Option[]) {
  const groups = new Map<string, Option[]>();
  for (const o of options) groups.set(o.river, [...(groups.get(o.river) ?? []), o]);
  const rank = (r: string) => (RIVER_ORDER.includes(r) ? RIVER_ORDER.indexOf(r) : 100);
  return [...groups.entries()]
    .sort(([a], [b]) => rank(a) - rank(b) || a.localeCompare(b))
    .map(([river, items]) => ({ river, label: RIVER_LABEL[river] ?? river, items }));
}

export function StationPicker({ current, options }: { current: string; options: Option[] }) {
  const router = useRouter();
  return (
    <label className="picker">
      <span className="sr-only">Elegir puerto</span>
      <select value={current} onChange={(e) => router.push(e.target.value === "victoria" ? "/" : `/${e.target.value}`)}>
        {groupByRiver(options).map((g) => (
          <optgroup key={g.river} label={g.label}>
            {g.items.map((o) => (
              <option key={o.slug} value={o.slug}>
                {o.name}
              </option>
            ))}
          </optgroup>
        ))}
      </select>
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" aria-hidden="true">
        <path d="M6 9l6 6 6-6" />
      </svg>
    </label>
  );
}
