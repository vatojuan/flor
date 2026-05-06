import Link from "next/link";

export default function AuthError() {
  return (
    <div style={{ textAlign: "center", marginTop: "2rem" }}>
      <h1>Error de Autenticación</h1>
      <p>Ocurrió un error durante la autenticación. Por favor, intenta nuevamente.</p>
      <p>
        <Link href="/login">Volver al Login</Link>
      </p>
    </div>
  );
}
