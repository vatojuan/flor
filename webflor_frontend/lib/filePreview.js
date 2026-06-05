// Helpers puros para Editar BD (panel admin). Sin DOM ni dependencias → testeables
// con vitest en environment 'node'. Spec: specs/admin-editar-db-rubro-preview.md.

const IMAGE_EXTS = ["png", "jpg", "jpeg", "gif", "webp", "bmp", "svg"];

/**
 * Decide como previsualizar un archivo: 'pdf' | 'image' | 'unsupported'.
 * Prioriza el content-type; si viene vacio o 'application/octet-stream',
 * cae a la extension del nombre.
 */
export function getPreviewKind(filename, contentType) {
  const ct = (contentType || "").toLowerCase();
  if (ct === "application/pdf") return "pdf";
  if (ct.startsWith("image/")) return "image";

  if (!ct || ct === "application/octet-stream") {
    const parts = (filename || "").toLowerCase().split(".");
    const ext = parts.length > 1 ? parts.pop() : "";
    if (ext === "pdf") return "pdf";
    if (IMAGE_EXTS.includes(ext)) return "image";
  }
  return "unsupported";
}

/**
 * Arma el querystring para GET /admin/users. La API usa paginas 1-based, asi que
 * mandamos page+1. Omite search/rubro cuando estan vacios.
 */
export function buildUsersQuery({ page, limit, search = "", rubro = "" }) {
  const params = new URLSearchParams({
    page: String(page + 1),
    limit: String(limit),
  });
  if (search) params.set("search", search);
  if (rubro) params.set("rubro", rubro);
  return params.toString();
}
