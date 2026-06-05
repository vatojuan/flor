// Spec: specs/admin-editar-db-rubro-preview.md
// Helpers puros (sin DOM) → vitest en environment 'node'.
import { describe, it, expect } from "vitest";
import { getPreviewKind, buildUsersQuery } from "./filePreview";

describe("getPreviewKind", () => {
  it("usa el content-type cuando viene claro", () => {
    expect(getPreviewKind("x", "application/pdf")).toBe("pdf");
    expect(getPreviewKind("x", "image/png")).toBe("image");
    expect(getPreviewKind("x", "image/jpeg")).toBe("image");
  });

  it("cae a la extension del nombre si el content-type es octet-stream o vacio", () => {
    expect(getPreviewKind("cv.pdf", "application/octet-stream")).toBe("pdf");
    expect(getPreviewKind("foto.JPG", "")).toBe("image");
    expect(getPreviewKind("foto.jpeg", null)).toBe("image");
    expect(getPreviewKind("logo.png", undefined)).toBe("image");
  });

  it("marca como unsupported lo que no es pdf ni imagen", () => {
    expect(getPreviewKind("doc.docx", "application/vnd.openxmlformats-officedocument.wordprocessingml.document")).toBe("unsupported");
    expect(getPreviewKind("notas.txt", "text/plain")).toBe("unsupported");
    expect(getPreviewKind("sin_extension", "")).toBe("unsupported");
    expect(getPreviewKind("", "")).toBe("unsupported");
  });
});

describe("buildUsersQuery", () => {
  it("usa page+1 y limit", () => {
    expect(buildUsersQuery({ page: 0, limit: 10 })).toBe("page=1&limit=10");
    expect(buildUsersQuery({ page: 2, limit: 25 })).toBe("page=3&limit=25");
  });

  it("incluye search y rubro cuando estan presentes", () => {
    const qs = buildUsersQuery({ page: 0, limit: 10, search: "juan", rubro: "Gastronomía" });
    const params = new URLSearchParams(qs);
    expect(params.get("page")).toBe("1");
    expect(params.get("search")).toBe("juan");
    expect(params.get("rubro")).toBe("Gastronomía");
  });

  it("omite search y rubro vacios", () => {
    const qs = buildUsersQuery({ page: 0, limit: 10, search: "", rubro: "" });
    expect(qs).toBe("page=1&limit=10");
  });
});
