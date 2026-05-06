// pages/apply/[token].js

import { useRouter } from "next/router";
import { useEffect, useState } from "react";
import Head from "next/head";
import { Container, Typography, Box, CircularProgress, Alert } from "@mui/material";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "https://api.fapmendoza.online";
// La URL pública donde vive el frontend de usuarios:
const USER_BASE = "https://www.fapmendoza.com/";

export default function ApplyPage() {
  const router = useRouter();
  const { token } = router.query;
  const [status, setStatus] = useState("loading"); // loading | success | error
  const [errorMsg, setErrorMsg] = useState("");

  useEffect(() => {
    if (!router.isReady || !token) return;

    const confirmApplication = async () => {
      try {
        const res = await fetch(`${API_URL}/api/job/apply/${token}`);
        const data = await res.json();
        if (!res.ok || !data.success) {
          throw new Error(data.detail || "Enlace inválido o expirado");
        }
        // guardamos el JWT FastAPI que regresa
        localStorage.setItem("userToken", data.token);
        setStatus("success");
        // redirige a la home pública después de mostrar confirmación
        setTimeout(() => {
          window.location.href = USER_BASE;
        }, 2000);
      } catch (err) {
        console.error("Error confirmando postulación:", err);
        setErrorMsg(err.message);
        setStatus("error");
      }
    };

    confirmApplication();
  }, [router.isReady, token]);

  return (
    <>
      <Head>
        <title>Confirmando tu postulación…</title>
      </Head>
      <Container maxWidth="sm" sx={{ mt: 8, minHeight: "60vh", textAlign: "center" }}>
        {status === "loading" && (
          <Box sx={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 2 }}>
            <CircularProgress />
            <Typography>Confirmando tu postulación…</Typography>
          </Box>
        )}
        {status === "success" && (
          <Alert severity="success" variant="filled">
            ¡Tu postulación fue confirmada correctamente!<br />
            Serás redirigido a la página principal…
          </Alert>
        )}
        {status === "error" && (
          <Alert severity="error" variant="filled">
            Hubo un problema al confirmar tu postulación:<br />
            {errorMsg || "El enlace ya se usó o es inválido."}
          </Alert>
        )}
      </Container>
    </>
  );
}

// Para evitar prerendering en admin (solo runtime)
export const getServerSideProps = () => ({ props: {} });
