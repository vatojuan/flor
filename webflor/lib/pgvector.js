// lib/pgvector.js

export function toVectorLiteral(arr) {
  return `[${arr.join(",")}]`;
}
