// Spec: specs/inbox-cv-attachment.md (criterio de visibilidad en el panel).
// Helper puro (sin DOM) → vitest en environment 'node'.
import { describe, it, expect } from "vitest";
import { summarizeScan } from "./scanSummary";

describe("summarizeScan — scan de una cuenta", () => {
  it("muestra 'X de N procesados · faltan R' cuando quedan pendientes", () => {
    const s = summarizeScan({ processed: 171, total_found: 350, remaining: 179 });
    expect(s.processed).toBe(171);
    expect(s.totalFound).toBe(350);
    expect(s.remaining).toBe(179);
    expect(s.text).toBe("171 de 350 procesados · faltan 179");
  });

  it("muestra solo 'X procesados' cuando se procesó todo", () => {
    const s = summarizeScan({ processed: 50, total_found: 50, remaining: 0 });
    expect(s.remaining).toBe(0);
    expect(s.text).toBe("50 procesados");
  });

  it("cae a processed cuando el backend viejo no manda total_found", () => {
    const s = summarizeScan({ processed: 20 });
    expect(s.totalFound).toBe(20);
    expect(s.remaining).toBe(0);
    expect(s.text).toBe("20 procesados");
  });
});

describe("summarizeScan — scan-all (varias cuentas)", () => {
  it("agrega processed/total_found/remaining de todas las cuentas", () => {
    const s = summarizeScan({
      results: [
        { account: "a@x.com", processed: 10, total_found: 10, remaining: 0 },
        { account: "b@x.com", processed: 5, total_found: 30, remaining: 25 },
      ],
    });
    expect(s.processed).toBe(15);
    expect(s.totalFound).toBe(40);
    expect(s.remaining).toBe(25);
    expect(s.text).toBe("15 de 40 procesados · faltan 25");
  });

  it("agrega aunque alguna cuenta no traiga total_found", () => {
    const s = summarizeScan({
      results: [
        { account: "a", processed: 3 },
        { account: "b", processed: 7, total_found: 7, remaining: 0 },
      ],
    });
    expect(s.processed).toBe(10);
    expect(s.totalFound).toBe(10);
    expect(s.text).toBe("10 procesados");
  });
});

describe("summarizeScan — bordes", () => {
  it("result nulo → vacío", () => {
    expect(summarizeScan(null)).toEqual({ processed: 0, totalFound: 0, remaining: 0, text: "" });
  });

  it("result con error → texto vacío", () => {
    expect(summarizeScan({ error: "IMAP caido" }).text).toBe("");
  });
});
