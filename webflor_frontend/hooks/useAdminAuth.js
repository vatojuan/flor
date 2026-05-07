// hooks/useAdminAuth.js

import { useState, useEffect } from "react";
import { useRouter } from "next/router";

function decodeJwt(token) {
  try {
    const payload = token.split(".")[1];
    const decoded = atob(payload.replace(/-/g, "+").replace(/_/g, "/"));
    return JSON.parse(decoded);
  } catch {
    return null;
  }
}

function isTokenExpired(payload) {
  if (!payload || !payload.exp) return true;
  // exp is in seconds, Date.now() is in ms
  return Date.now() >= payload.exp * 1000;
}

export default function useAdminAuth() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    if (typeof window === "undefined") return;

    const token = localStorage.getItem("adminToken");
    if (token) {
      const payload = decodeJwt(token);
      if (payload && payload.sub && !isTokenExpired(payload)) {
        setUser({ id: payload.sub, ...payload });
      } else {
        // Token inválido o expirado — limpiar y redirigir
        localStorage.removeItem("adminToken");
      }
    }
    setLoading(false);
  }, [router]);

  useEffect(() => {
    if (!loading && !user) {
      router.replace("/admin/login");
    }
  }, [loading, user, router]);

  return { user, loading };
}
