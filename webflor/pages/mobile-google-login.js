import { useEffect } from "react";
import { signIn, useSession } from "next-auth/react";
import { useRouter } from "next/router";

/**
 * Mobile Google Login Bridge
 *
 * Flow:
 * 1. Mobile opens: /mobile-google-login?returnUrl=exp://...
 * 2. Page triggers Google sign-in via NextAuth
 * 3. NextAuth redirects back: /mobile-google-login?returnUrl=...&from=google
 * 4. Page reads JWT from session and redirects to returnUrl?token=JWT
 */
export default function MobileGoogleLogin() {
  const { data: session, status } = useSession();
  const router = useRouter();

  const returnUrl = router.query.returnUrl || "fapmendoza://login";
  // "from=google" is added to callbackUrl so we know we're returning from OAuth
  const fromGoogle = router.query.from === "google";

  useEffect(() => {
    if (status === "loading" || !router.isReady) return;

    // Returning from Google OAuth - extract token and redirect to app
    if (fromGoogle && status === "authenticated" && session) {
      const token = session.user?.token || session.accessToken;
      const separator = String(returnUrl).includes("?") ? "&" : "?";

      if (token) {
        window.location.href = `${returnUrl}${separator}token=${token}`;
      } else {
        window.location.href = `${returnUrl}${separator}error=no_token`;
      }
      return;
    }

    // First visit - trigger Google sign-in
    if (!fromGoogle) {
      const cb = `/mobile-google-login?returnUrl=${encodeURIComponent(returnUrl)}&from=google`;
      signIn("google", { callbackUrl: cb });
    }
  }, [status, session, router.isReady, fromGoogle, returnUrl]);

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
          {fromGoogle
            ? "Redirigiendo a la app..."
            : "Conectando con Google..."}
        </p>
      </div>
    </div>
  );
}
