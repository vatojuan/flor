// hooks/useAdminAuth.js

import { useState, useEffect } from "react";
import { useRouter } from "next/router";

// Helper para decodificar JWT sin dependencia externa
function decodeJwt(token) {
  try {
    const payload = token.split(".")[1];
    const decoded = atob(payload.replace(/-/g, "+").replace(/_/g, "/"));
    return JSON.parse(decoded);
  } catch {
    return null;
  }
}

export default function useAdminAuth() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    // Solo en cliente
    if (typeof window === "undefined") return;

    const token = localStorage.getItem("adminToken");
    if (token) {
      const payload = decodeJwt(token);
      if (payload && payload.sub) {
        // puedes extraer más campos si los incluyes en tu JWT
        setUser({ id: payload.sub, ...payload });
      } else {
        // Token inválido — bórralo y redirige
        localStorage.removeItem("adminToken");
      }
    }
    setLoading(false);
  }, [router]);

  useEffect(() => {
    // Cuando ya no estamos cargando y no hay usuario, vamos al login
    if (!loading && !user) {
      router.push("/admin/login");
    }
  }, [loading, user, router]);

  return { user, loading };
}
