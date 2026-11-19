// @vitest-environment jsdom
import { describe, it, expect, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import { Forecast } from "@/components/Forecast";
import { Hero } from "@/components/Hero";
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

describe("Hero: la pantalla es la regla", () => {
  it("sin umbrales no dibuja líneas de alerta ni evacuación", () => {
    const { container } = render(<Hero station={{ ...victoria, alertM: null, evacuationM: null, level: "sin-umbral" }} />);
    expect(container.querySelector(".threshold")).toBeNull();
  });
  it("con umbrales dibuja las dos líneas y describe la regla para lectores de pantalla", () => {
    const { container } = render(<Hero station={victoria} />);
    expect(container.querySelectorAll(".threshold").length).toBe(2);
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
  it("tiene el link Sobre mí al portfolio", () => {
    render(<SourceFooter />);
    expect(screen.getByRole("link", { name: "Sobre mí" }).getAttribute("href")).toBe("https://gastonpalav.com.ar/");
  });
});

describe("frescura calculada en el navegador (la caché del servidor puede tener el flag congelado)", () => {
  it("Hero avisa aunque el servidor haya dicho stale:false si la lectura ya es vieja", () => {
    render(<Hero station={{ ...victoria, ts: "2020-01-01T12:00:00.000Z", stale: false }} />);
    expect(document.body.textContent).toContain("Prefectura no publicó datos nuevos desde");
  });
  it("Upstream marca dato viejo aunque el servidor haya dicho stale:false", () => {
    render(<Upstream stations={[{ ...victoria, slug: "parana", name: "Paraná", ts: "2020-01-01T12:00:00.000Z", stale: false }]} />);
    expect(document.body.textContent).toContain("dato viejo");
  });
});

import { YearFacts } from "@/components/YearFacts";

describe("YearFacts: marcas pintadas", () => {
  it("pinta hoy, hace un año y la alerta con sus cifras en texto", () => {
    const { container } = render(<YearFacts rate={0.12} daysAboveAlert={4} lastYearM={3.37} nowM={4.91} alertM={4.6} />);
    expect(container.querySelectorAll(".mark").length).toBe(3);
    const t = document.body.textContent ?? "";
    expect(t).toContain("Hoy 4,91");
    expect(t).toContain("Hace un año 3,37");
    expect(t).toContain("Hoy el río está 1,54 m más alto que hace un año.");
    expect(t).toContain("4 días por encima en los últimos 12 meses");
  });
  it("los rótulos no se pisan aunque las marcas estén pegadas", () => {
    const { container } = render(<YearFacts rate={0} daysAboveAlert={0} lastYearM={4.6} nowM={4.61} alertM={4.6} />);
    const tops = [...container.querySelectorAll<HTMLElement>(".mark-label")].map((e) => parseFloat(e.style.top)).sort((a, b) => a - b);
    for (let i = 1; i < tops.length; i++) expect(tops[i]! - tops[i - 1]!).toBeGreaterThanOrEqual(56);
  });
  it("con el río más bajo que hace un año lo dice al revés", () => {
    render(<YearFacts rate={null} daysAboveAlert={null} lastYearM={4.0} nowM={3.2} alertM={4.6} />);
    expect(document.body.textContent).toContain("Hoy el río está 80 cm más bajo que hace un año.");
  });
  it("sin lectura de hoy no muestra nada", () => {
    const { container } = render(<YearFacts rate={null} daysAboveAlert={null} lastYearM={3} nowM={null} />);
    expect(container.innerHTML).toBe("");
  });
});

describe("Forecast: cómo puede seguir", () => {
  const forecast = {
    days: [
      { date: "2026-11-20", ahead: 1, loM: 4.84, hiM: 4.95, maeM: 0.019, recentMaeM: 0.021 },
      { date: "2026-11-22", ahead: 3, loM: 4.94, hiM: 5.09, maeM: 0.035, recentMaeM: 0.058 },
    ],
    coverage: 0.76,
    tested: 180,
    from: ["Diamante", "Santa Fe", "Paraná"],
  };
  // La frescura se mira en el navegador con la hora real: la lectura de la prueba tiene que ser de recién.
  const fresh: StationDto = { ...victoria, ts: new Date(Date.now() - 3_600_000).toISOString() };
  it("muestra un rango por día, nunca un número solo, y de dónde sale", () => {
    const { container } = render(<Forecast forecast={forecast} station={fresh} />);
    const t = document.body.textContent ?? "";
    expect(container.querySelectorAll(".fc-band").length).toBe(2);
    expect(t).toContain("viernes 20");
    expect(t).toContain("4,84 a 4,95");
    expect(t).toContain("domingo 22");
    expect(t).toContain("lo que ya pasó en Diamante, Santa Fe y Paraná");
  });
  it("dice que no es oficial y publica cuánto le erra", () => {
    render(<Forecast forecast={forecast} station={fresh} />);
    const t = document.body.textContent ?? "";
    expect(t).toContain("Una estimación propia, no oficial, del promedio de cada día");
    expect(t).toContain("a 1 día, 2 cm; a 3 días, 4 cm");
    expect(t).toContain("En las últimas semanas, con el río más movido, erró más: a 1 día, 2 cm; a 3 días, 6 cm.");
    expect(t).toContain("dentro del rango el 76% de las veces");
    expect(t).toContain("Instituto Nacional del Agua");
  });
  it("compara el rango con los niveles de Prefectura sin dar órdenes", () => {
    render(<Forecast forecast={forecast} station={fresh} />);
    const t = document.body.textContent ?? "";
    expect(t).toContain("El viernes 20 el rango ya llega al nivel de evacuación de Prefectura (4,90 m); el domingo 22 queda entero por encima.");
    expect(t).not.toMatch(/evacu(á|ar|en)\b/i);
  });
  it("explica cómo se calcula, con la fórmula y los puertos que usa", () => {
    const { container } = render(<Forecast forecast={forecast} station={fresh} />);
    const how = container.querySelector("details.fc-how");
    expect(how).not.toBeNull();
    expect(how!.hasAttribute("open")).toBe(false);
    const t = how!.textContent ?? "";
    expect(t).toContain("cambio = ½ × tendencia + ½ × lo que viene de arriba");
    expect(t).toContain("Lo que ya subió o bajó en Diamante, Santa Fe y Paraná y todavía no llegó acá");
    expect(t).toContain("no le gana por un 10% a decir “queda igual”");
  });
  it("si últimamente no erró más que en el promedio, no lo agrega", () => {
    const calm = { ...forecast, days: forecast.days.map((d) => ({ ...d, recentMaeM: d.maeM / 2 })) };
    render(<Forecast forecast={calm} station={fresh} />);
    expect(document.body.textContent).not.toContain("En las últimas semanas");
  });
  it("se oculta aunque el servidor haya dicho stale:false si la lectura ya es vieja", () => {
    const { container } = render(<Forecast forecast={forecast} station={{ ...victoria, ts: "2026-11-15T15:00:00.000Z", stale: false }} />);
    expect(container.innerHTML).toBe("");
  });
  it("con dato viejo, sin lectura o sin estimación no muestra nada", () => {
    expect(render(<Forecast forecast={forecast} station={{ ...fresh, ts: "2026-11-15T15:00:00.000Z", stale: true }} />).container.innerHTML).toBe("");
    expect(render(<Forecast forecast={forecast} station={{ ...fresh, heightM: null }} />).container.innerHTML).toBe("");
    expect(render(<Forecast forecast={null} station={fresh} />).container.innerHTML).toBe("");
  });
});
