import { useSession, signOut } from "next-auth/react";
import { useRouter } from "next/router";
import { useEffect, useState } from "react";

export default function Profile() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [name, setName] = useState(session?.user?.name || "");

  if (status === "loading") {
    return <p>Cargando...</p>;
  }

  if (!session) {
    useEffect(() => {
      router.push("/login");
    }, [router]);
    return null;
  }

  const handleSubmit = (e) => {
    e.preventDefault();
    alert(`Perfil actualizado para: ${name}`);
  };

  return (
    <div style={{ textAlign: "center", marginTop: "2rem" }}>
      <h1>Perfil de Usuario</h1>
      {/* Mostrar imagen de perfil */}
      <img
        src={session.user.image || "/images/default-user.png"}
        alt="Imagen de perfil"
        style={{ width: "100px", height: "100px", borderRadius: "50%", objectFit: "cover" }}
      />
      <form onSubmit={handleSubmit}>
        <div>
          <label>Nombre:</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />
        </div>
        <button type="submit">Actualizar Perfil</button>
      </form>
      <p>
        <a href="/dashboard">Volver al Dashboard</a>
      </p>
      <p>
        <button onClick={() => signOut({ callbackUrl: "/login" })}>
          Cerrar sesión
        </button>
      </p>
    </div>
  );
}
