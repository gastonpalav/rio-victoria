// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach, beforeEach } from "vitest";
import { render, cleanup } from "@testing-library/react";

vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh: () => {} }) }));
import { AutoRefresh, REFRESH_EVERY_MS, REFRESH_ON_RETURN_AFTER_MS } from "@/components/AutoRefresh";

const setVisibility = (v: "visible" | "hidden") =>
  Object.defineProperty(document, "visibilityState", { value: v, configurable: true });

beforeEach(() => {
  vi.useFakeTimers();
  setVisibility("visible");
});
afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

describe("AutoRefresh", () => {
  it("al volver a la pestaña después de un rato vuelve a pedir los datos", () => {
    const refresh = vi.fn();
    render(<AutoRefresh refresh={refresh} />);
    setVisibility("hidden");
    document.dispatchEvent(new Event("visibilitychange"));
    vi.advanceTimersByTime(REFRESH_ON_RETURN_AFTER_MS + 1);
    setVisibility("visible");
    document.dispatchEvent(new Event("visibilitychange"));
    expect(refresh).toHaveBeenCalledTimes(1);
  });

  it("no pide de nuevo si se acaba de pedir", () => {
    const refresh = vi.fn();
    render(<AutoRefresh refresh={refresh} />);
    document.dispatchEvent(new Event("visibilitychange"));
    expect(refresh).not.toHaveBeenCalled();
  });

  it("una página restaurada de la caché del navegador se actualiza siempre", () => {
    const refresh = vi.fn();
    render(<AutoRefresh refresh={refresh} />);
    const e = new Event("pageshow") as PageTransitionEvent;
    Object.defineProperty(e, "persisted", { value: true });
    window.dispatchEvent(e);
    expect(refresh).toHaveBeenCalledTimes(1);
  });

  it("con la pestaña a la vista se actualiza cada tanto; oculta, no", () => {
    const refresh = vi.fn();
    render(<AutoRefresh refresh={refresh} />);
    vi.advanceTimersByTime(REFRESH_EVERY_MS);
    expect(refresh).toHaveBeenCalledTimes(1);
    setVisibility("hidden");
    vi.advanceTimersByTime(REFRESH_EVERY_MS);
    expect(refresh).toHaveBeenCalledTimes(1);
  });
});
