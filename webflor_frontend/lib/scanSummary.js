// Helper puro para resumir el resultado de un scan de bandeja en el panel admin.
// Sin DOM ni dependencias → testeable con vitest (environment 'node').
// Spec: specs/inbox-cv-attachment.md (visibilidad de cuántos faltan).

function buildText({ processed, totalFound, remaining }) {
  if (remaining > 0) return `${processed} de ${totalFound} procesados · faltan ${remaining}`;
  if (totalFound > processed) return `${processed} de ${totalFound} procesados`;
  return `${processed} procesados`;
}

/**
 * Normaliza el resultado de un scan (de una cuenta o scan-all) a:
 *   { processed, totalFound, remaining, text }
 *
 * - scan-all (`result.results` es un array): suma los totales de cada cuenta.
 * - `total_found`/`remaining` pueden faltar (backend viejo) → cae a `processed`.
 */
export function summarizeScan(result) {
  const empty = { processed: 0, totalFound: 0, remaining: 0, text: "" };
  if (!result || result.error) return empty;

  if (Array.isArray(result.results)) {
    const agg = result.results.reduce(
      (a, r) => ({
        processed: a.processed + (r.processed || 0),
        totalFound: a.totalFound + (r.total_found ?? r.processed ?? 0),
        remaining: a.remaining + (r.remaining || 0),
      }),
      { processed: 0, totalFound: 0, remaining: 0 }
    );
    return { ...agg, text: buildText(agg) };
  }

  if (result.processed === undefined) return empty;
  const processed = result.processed || 0;
  const totalFound = result.total_found ?? processed;
  const remaining = result.remaining || 0;
  return { processed, totalFound, remaining, text: buildText({ processed, totalFound, remaining }) };
}
