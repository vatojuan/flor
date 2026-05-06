// hooks/useAuthUser.js
import { useEffect, useState, useCallback } from "react";
import { useSession } from "next-auth/react";

export default function useAuthUser() {
  const { data: session, status: sessionStatus } = useSession();
  const [token, setToken] = useState(null);
  const [user, setUser] = useState(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (sessionStatus === "loading") return;

    const tryLoadUser = async () => {
      // Caso 1: NextAuth autenticado con token de FastAPI
      if (sessionStatus === "authenticated" && session?.user?.token) {
        setUser({
          id: session.user.id,
          role: session.user.role,
          name: session.user.name,
        });
        setToken(session.user.token);
        setReady(true);
        return;
      }

      // Caso 2: No autenticado → buscamos en localStorage
      const localToken = localStorage.getItem("userToken");
      if (localToken) {
        try {
          const payload = JSON.parse(atob(localToken.split(".")[1]));
          setUser({
            id: payload.sub,
            role: payload.role || "empleado",
            name: payload.name || "Empleado",
          });
          setToken(localToken);
        } catch (err) {
          console.warn("Token inválido en localStorage, se elimina:", err);
          localStorage.removeItem("userToken");
          setUser(null);
          setToken(null);
        }
      }

      // Ya cargamos lo que había
      setReady(true);
    };

    tryLoadUser();
  }, [session, sessionStatus]);

  // Header Authorization para fetch
  const authHeader = useCallback(
    () => (token ? { Authorization: `Bearer ${token}` } : {}),
    [token]
  );

  // Función para obtener las aplicaciones del usuario
  const fetchApplications = useCallback(async () => {
    const res = await fetch(
      `${process.env.NEXT_PUBLIC_API}/api/job/my-applications`,
      {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          ...authHeader(),
        },
      }
    );
    if (!res.ok) {
      throw new Error(`Error ${res.status} cargando aplicaciones`);
    }
    return await res.json();
  }, [authHeader]);

  return {
    user,
    role: user?.role,
    token,
    ready,
    sessionStatus,
    authHeader,
    fetchApplications,
  };
}
