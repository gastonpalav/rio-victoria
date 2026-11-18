// @vitest-environment jsdom
import { describe, it, expect, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import { Hero } from "@/components/Hero";
import { LevelGauge } from "@/components/LevelGauge";
import { SourceFooter } from "@/components/SourceFooter";
import { Upstream } from "@/components/Upstream";
import type { StationDto } from "@/lib/api";

afterEach(cleanup);

const victoria: StationDto = {
  slug: "victoria", name: "Victoria", river: "PARANA", riverOrder: 25, heightM: 4.85, prevHeightM: 4.84,
  ts: "2026-11-18T19:00:00.000Z", trend: "crece", level: "alerta", alertM: 4.6, evacuationM: 4.9, periodHours: 2, stale: false,
};

describe("Hero", () => {
  it("muestra altura, tendencia y cuánto falta para el nivel de Prefectura", () => {
    render(<Hero station={victoria} />);
    expect(screen.getByText("4,85")).toBeTruthy();
    expect(screen.getByText("Creciendo")).toBeTruthy();
    expect(document.body.textContent).toContain("Faltan 5 cm para el nivel de evacuación de Prefectura");
  });
  it("con dato viejo avisa y no lo presenta como actual", () => {
    render(<Hero station={{ ...victoria, ts: "2026-11-15T15:00:00.000Z", stale: true }} />);
    expect(document.body.textContent).toContain("Prefectura no publicó datos nuevos desde 15/11 12:00");
    expect(document.body.textContent).not.toMatch(/hace \d/);
  });
  it("nunca da órdenes de evacuar", () => {
    render(<Hero station={{ ...victoria, heightM: 5.1, level: "evacuacion" }} />);
    expect(document.body.textContent).toContain("20 cm por encima del nivel de evacuación de Prefectura");
    expect(document.body.textContent).not.toMatch(/evacu(á|ar|en)\b/i);
  });
  it("sin lecturas muestra un mensaje claro", () => {
    render(<Hero station={{ ...victoria, heightM: null, ts: null, trend: null, level: null, stale: true }} />);
    expect(document.body.textContent).toContain("Todavía no hay lecturas de este puerto");
  });
});

describe("LevelGauge", () => {
  it("sin umbrales no dibuja nada", () => {
    const { container } = render(<LevelGauge heightM={1.2} alertM={null} evacuationM={null} />);
    expect(container.innerHTML).toBe("");
  });
  it("con umbrales describe la regla para lectores de pantalla", () => {
    render(<LevelGauge heightM={4.85} alertM={4.6} evacuationM={4.9} />);
    expect(screen.getByRole("img").getAttribute("aria-label")).toContain("4,85");
  });
});

describe("Upstream", () => {
  it("dice cuánto está cada puerto sobre su nivel", () => {
    render(<Upstream stations={[{ ...victoria, slug: "parana", name: "Paraná", heightM: 5.71, alertM: 4.7, evacuationM: 5.0 }]} />);
    expect(document.body.textContent).toContain("71 cm sobre su nivel de evacuación");
  });
});

describe("SourceFooter", () => {
  it("cita a Prefectura y aclara que no es oficial", () => {
    render(<SourceFooter />);
    const link = screen.getByRole("link", { name: "Prefectura Naval Argentina" });
    expect(link.getAttribute("href")).toBe("https://contenidosweb.prefecturanaval.gob.ar/alturas/");
    expect(document.body.textContent).toContain("Sitio no oficial");
  });
});
