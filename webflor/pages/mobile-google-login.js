import { useEffect, useState } from "react";
import { signIn, signOut, useSession } from "next-auth/react";
import { useRouter } from "next/router";

/**
 * Mobile Google Login Bridge
 *
 * Flow:
 * 1. Mobile app opens this page with ?returnUrl=exp://... or ?returnUrl=fapmendoza://...
 * 2. Page clears any existing NextAuth session, then triggers Google sign-in
 *    with prompt=select_account so the user can always choose which account
 * 3. After Google login, NextAuth redirects back here with active session
 * 4. Page redirects to returnUrl?token=JWT (back to the mobile app)
 */
export default function MobileGoogleLogin() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [phase, setPhase] = useState("init"); // init | signing-in | done

  // Get the return URL from query params (sent by mobile app)
  const returnUrl = router.query.returnUrl || "fapmendoza://login";

  useEffect(() => {
    if (status === "loading") return;

    // Phase 1: clear any existing session so Google always shows account picker
    if (phase === "init") {
      if (status === "authenticated") {
        // Sign out without redirect, then trigger Google sign-in
        signOut({ redirect: false }).then(() => {
          setPhase("signing-in");
          signIn("google", {
            callbackUrl: `/mobile-google-login?returnUrl=${encodeURIComponent(returnUrl)}`,
            prompt: "select_account",
          });
        });
      } else {
        setPhase("signing-in");
        signIn("google", {
          callbackUrl: `/mobile-google-login?returnUrl=${encodeURIComponent(returnUrl)}`,
          prompt: "select_account",
        });
      }
      return;
    }

    // Phase 2: after Google login, redirect to mobile app with token
    if (status === "authenticated" && session && phase === "signing-in") {
      setPhase("done");
      const token = session.user?.token || session.accessToken;
      const separator = String(returnUrl).includes("?") ? "&" : "?";

      if (token) {
        window.location.href = `${returnUrl}${separator}token=${token}`;
      } else {
        window.location.href = `${returnUrl}${separator}error=no_token`;
      }
    }
  }, [status, session, phase, returnUrl]);

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
