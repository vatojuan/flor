import { useEffect, useState } from "react";
import { signIn, useSession } from "next-auth/react";
import { useRouter } from "next/router";

/**
 * Mobile Google Login Bridge
 *
 * Flow:
 * 1. Mobile app opens this page with ?returnUrl=exp://... or ?returnUrl=fapmendoza://...
 * 2. Page auto-triggers Google sign-in via NextAuth
 * 3. After Google login, NextAuth redirects back here with active session
 * 4. Page redirects to returnUrl?token=JWT (back to the mobile app)
 */
export default function MobileGoogleLogin() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [triggered, setTriggered] = useState(false);

  // Get the return URL from query params (sent by mobile app)
  const returnUrl = router.query.returnUrl || "fapmendoza://login";

  useEffect(() => {
    if (status === "loading") return;

    // If not authenticated, trigger Google sign-in
    if (status === "unauthenticated" && !triggered) {
      setTriggered(true);
      // Pass returnUrl through the callback so it survives the OAuth redirect
      signIn("google", {
        callbackUrl: `/mobile-google-login?returnUrl=${encodeURIComponent(returnUrl)}`,
      });
      return;
    }

    // If authenticated, redirect to mobile app with token
    if (status === "authenticated" && session) {
      const token = session.user?.token || session.accessToken;
      const separator = String(returnUrl).includes("?") ? "&" : "?";

      if (token) {
        window.location.href = `${returnUrl}${separator}token=${token}`;
      } else {
        window.location.href = `${returnUrl}${separator}error=no_token`;
      }
    }
  }, [status, session, triggered, returnUrl]);

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
