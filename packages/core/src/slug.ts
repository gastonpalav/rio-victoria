export function slugify(name: string): string {
  return name
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

const DISPLAY_EXCEPTIONS: Record<string, string> = {
  PARANA: "Paraná",
  ITUZAINGO: "Ituzaingó",
  ITATI: "Itatí",
  ZARATE: "Zárate",
  "MARTIN GARCIA": "Martín García",
  "PUERTO MANI": "Puerto Maní",
  "ITA IBATE": "Itá Ibaté",
  "SAN NICOLAS": "San Nicolás",
  "VILLA CONSTITUCION": "Villa Constitución",
  "CONCEPCION DEL URUGUAY": "Concepción del Uruguay",
  "COLON": "Colón",
  "GUALEGUAYCHU": "Gualeguaychú",
};

const LOWER_WORDS = new Set(["de", "del", "la", "las", "los", "el", "y"]);

export function displayName(name: string): string {
  const key = name.trim().toUpperCase();
  if (DISPLAY_EXCEPTIONS[key]) return DISPLAY_EXCEPTIONS[key];
  return key
    .toLowerCase()
    .split(/\s+/)
    .map((w, i) => (i > 0 && LOWER_WORDS.has(w) ? w : w.charAt(0).toUpperCase() + w.slice(1)))
    .join(" ");
}
