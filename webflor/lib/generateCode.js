// lib/generateCode.js
export function generarCodigo(longitud = 6) {
    const caracteres = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ";
    let resultado = "";
    for (let i = 0; i < longitud; i++) {
      resultado += caracteres.charAt(Math.floor(Math.random() * caracteres.length));
    }
    return resultado;
  }
  