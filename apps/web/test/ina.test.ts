import { describe, it, expect, vi, afterEach } from "vitest";
import { readFileSync } from "node:fs";
import { fetchInaRun, fetchInaStations, inaFor, inaStationMap, parseInaRun } from "@/lib/ina";

const read = (f: string) => JSON.parse(readFileSync(new URL(`./fixtures/${f}`, import.meta.url), "utf8"));
const estaciones = read("ina-estaciones.json");
const corrida = read("ina-corrida-victoria.json");
const now = new Date("2026-11-21T15:00:00Z");
const run = (pronosticos: unknown[]) => ({ forecast_date: "2026-11-20T03:00:00.000Z", series: [{ pronosticos }] });
const p = (start: string, end: string, qualifier: string, valor: unknown) => ({
  timestart: `${start}T03:00:00.000Z`, timeend: `${end}T03:00:00.000Z`, qualifier, valor,
});

describe("inaStationMap", () => {
  it("id de Prefectura (id_externo) → id del INA", () => {
    expect(inaStationMap(estaciones)).toEqual({ 230: 29, 250: 31, 260: 32 });
  });
  it("solo escalas de Prefectura: otra red con el mismo id_externo no se cruza", () => {
    const otra = [...estaciones, { id: 920, id_externo: "999", tabla: "emas" }, { id: 921, id_externo: "260", tabla: "red_inta" }];
    expect(inaStationMap(otra)).toEqual({ 230: 29, 250: 31, 260: 32 });
  });
  it("con una respuesta rota da null; id_externo vacío se saltea", () => {
    for (const bad of [null, "<html>", {}, []]) expect(inaStationMap(bad)).toBeNull();
    expect(inaStationMap([{ id: 5, id_externo: null, tabla: "alturas_prefe" }, ...estaciones])).toEqual({ 230: 29, 250: 31, 260: 32 });
  });
});

describe("parseInaRun", () => {
  it("arma las semanas con su rango, en orden", () => {
    const f = parseInaRun(corrida)!;
    expect(f.runDate).toBe("2026-11-20T03:00:00.000Z");
    expect(f.weeks).toHaveLength(9);
    expect(f.weeks[2]).toEqual({ start: "2026-11-27T03:00:00.000Z", end: "2026-12-04T03:00:00.000Z", loM: 5.37, hiM: 5.39 });
  });
  it("solo main → lo = hi; min > max se ordena; valores no numéricos se ignoran", () => {
    const w = parseInaRun(
      run([
        p("2026-11-27", "2026-12-04", "min", 5.5),
        p("2026-11-27", "2026-12-04", "max", 5.2),
        p("2026-11-20", "2026-11-27", "main", 5.16),
        p("2026-11-20", "2026-11-27", "max", null),
      ]),
    )!.weeks;
    expect(w[0]).toMatchObject({ start: "2026-11-20T03:00:00.000Z", loM: 5.16, hiM: 5.16 });
    expect(w[1]).toMatchObject({ loM: 5.2, hiM: 5.5 });
  });
  it("si no viene exactamente una serie, no adivina de qué puerto es", () => {
    expect(parseInaRun({ ...corrida, series: [...corrida.series, ...corrida.series] })).toBeNull();
    expect(parseInaRun({ ...corrida, series: [] })).toBeNull();
  });
  it("respuestas rotas → null, sin tirar error", () => {
    for (const bad of [null, "<html>", {}, [], { series: "x" }, { forecast_date: "nada", series: corrida.series }, run([])])
      expect(parseInaRun(bad)).toBeNull();
  });
});

describe("inaFor", () => {
  const f = parseInaRun(corrida)!;
  it("descarta semanas terminadas y deja como mucho 4", () => {
    const r = inaFor(f, now)!;
    expect(r.weeks).toHaveLength(4);
    expect(r.weeks[0]!.start).toBe("2026-11-20T03:00:00.000Z"); // la del 13 al 20 ya terminó
    expect(r.runDate).toBe(f.runDate);
  });
  it("con una corrida de más de 10 días no muestra nada", () => {
    expect(inaFor(f, new Date("2026-12-01T04:00:00Z"))).toBeNull(); // 11 días
    expect(inaFor(f, new Date("2026-11-29T15:00:00Z"))).not.toBeNull();
  });
  it("sin semanas por delante, o sin datos → null", () => {
    expect(inaFor({ ...f, runDate: "2027-01-14T03:00:00.000Z" }, new Date("2027-01-16T00:00:00Z"))).toBeNull();
    expect(inaFor(null, now)).toBeNull();
  });
});

describe("fetchInaStations / fetchInaRun", () => {
  afterEach(() => vi.unstubAllGlobals());
  const respond = (body: unknown) =>
    vi.stubGlobal("fetch", vi.fn(async () => (body instanceof Error ? Promise.reject(body) : new Response(typeof body === "string" ? body : JSON.stringify(body)))));
  const urls = () => (fetch as unknown as { mock: { calls: string[][] } }).mock.calls.map((c) => c[0]);

  it("la lista de puertos es un solo pedido, para todos", async () => {
    respond(estaciones);
    expect(await fetchInaStations()).toEqual({ 230: 29, 250: 31, 260: 32 });
    expect(urls()).toEqual(["https://alerta.ina.gob.ar/a5/obs/puntual/estaciones?tabla=alturas_prefe"]);
  });
  it("la corrida se pide filtrada por puerto", async () => {
    respond(corrida);
    expect((await fetchInaRun(32))?.weeks).toHaveLength(9);
    expect(urls()).toHaveLength(1);
    expect(urls()[0]).toContain("calibrados/434/corridas/last?");
    expect(urls()[0]).toContain("estacion_id=32");
  });
  it("si la API falla o devuelve HTML: null", async () => {
    respond(new Error("timeout"));
    expect(await fetchInaStations()).toBeNull();
    expect(await fetchInaRun(32)).toBeNull();
    respond("<html>mantenimiento</html>");
    expect(await fetchInaStations()).toBeNull();
    expect(await fetchInaRun(32)).toBeNull();
  });
});
