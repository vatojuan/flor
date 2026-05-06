import crypto from "crypto";

export function generarCodigo(longitud = 6) {
  const caracteres = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ";
  const bytes = crypto.randomBytes(longitud);
  let resultado = "";
  for (let i = 0; i < longitud; i++) {
    resultado += caracteres[bytes[i] % caracteres.length];
  }
  return resultado;
}
  