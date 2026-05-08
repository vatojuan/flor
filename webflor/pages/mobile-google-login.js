import { useEffect, useState } from "react";
import { signIn, useSession } from "next-auth/react";
import { useRouter } from "next/router";

/**
 * This page is opened by the mobile app via WebBrowser.
 * Flow:
 * 1. Mobile opens this page
 * 2. Page auto-redirects to Google OAuth via NextAuth
 * 3. After Google login, NextAuth redirects back here with a session
 * 4. Page reads the JWT from the session and redirects to fapmendoza://login?token=JWT
 */
export default function MobileGoogleLogin() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [triggered, setTriggered] = useState(false);

  useEffect(() => {
    // If not authenticated, trigger Google sign-in
    if (status === "unauthenticated" && !triggered) {
      setTriggered(true);
      signIn("google", { callbackUrl: "/mobile-google-login" });
    }

    // If authenticated, redirect to mobile app with token
    if (status === "authenticated" && session?.user?.token) {
      const token = session.user.token || session.accessToken;
      if (token) {
        window.location.href = `fapmendoza://login?token=${token}`;
      } else {
        window.location.href = `fapmendoza://login?error=no_token`;
      }
    }

    if (status === "authenticated" && !session?.user?.token && !session?.accessToken) {
      // Session exists but no FastAPI token - try accessToken
      window.location.href = `fapmendoza://login?error=no_fastapi_token`;
    }
  }, [status, session, triggered]);

  return (
    <div
      style={{
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        minHeight: "100vh",
        backgroundColor: "#103B40",
        color: "white",
        fontFamily: "system-ui, sans-serif",
      }}
    >
      <div style={{ textAlign: "center" }}>
        <h2 style={{ color: "#D96236" }}>FAP Mendoza</h2>
        <p>
          {status === "loading"
            ? "Conectando con Google..."
            : status === "authenticated"
            ? "Redirigiendo a la app..."
            : "Iniciando sesión con Google..."}
        </p>
      </div>
    </div>
  );
}
