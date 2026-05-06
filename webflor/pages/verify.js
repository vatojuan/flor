import { useState, useEffect } from "react";
import { useRouter } from "next/router";
import { Box, Container, Typography, TextField, Button, Snackbar, Alert } from "@mui/material";

export default function Verify() {
  const router = useRouter();
  const { email } = router.query; // Se obtiene el email desde la URL
  const [codigo, setCodigo] = useState("");
  const [snackbar, setSnackbar] = useState({ open: false, message: "", severity: "success" });

  // Si no se encuentra el email en el query, redirige a registro
  useEffect(() => {
    if (!email) {
      router.push("/register");
    }
  }, [email, router]);

  const handleVerificar = async (e) => {
    e.preventDefault();
    const res = await fetch("/api/auth/verify-code", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, code: codigo }),
    });
    const data = await res.json();
    if (res.ok) {
      setSnackbar({ open: true, message: "¡Correo verificado exitosamente!", severity: "success" });
      setTimeout(() => router.push("/login"), 3000);
    } else {
      // Si se recibe el error de exceder reenvíos, redirige a registro
      if (data.error && data.error.includes("excedido el límite de reenvíos")) {
        setSnackbar({ open: true, message: data.error, severity: "error" });
        setTimeout(() => router.push("/register"), 3000);
      } else {
        setSnackbar({ open: true, message: data.error || "Error en la verificación", severity: "error" });
      }
    }
  };

  const handleReenviar = async () => {
    const res = await fetch("/api/auth/resend-code", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    });
    const data = await res.json();
    if (res.ok) {
      setSnackbar({ open: true, message: data.message, severity: "success" });
    } else {
      // Si se excede el límite de reenvíos, redirige a registro
      if (data.error && data.error.includes("excedido el límite de reenvíos")) {
        setSnackbar({ open: true, message: data.error, severity: "error" });
        setTimeout(() => router.push("/register"), 3000);
      } else {
        setSnackbar({ open: true, message: data.error, severity: "error" });
      }
    }
  };

  return (
    <Box
      sx={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        bgcolor: "background.default",
      }}
    >
      <Container maxWidth="sm" sx={{ textAlign: "center", p: 4, boxShadow: 3, borderRadius: 2, bgcolor: "background.paper" }}>
        <Typography variant="h4" gutterBottom>
          Verificar Correo
        </Typography>
        <Typography variant="body1" gutterBottom>
          Se ha enviado un código de verificación a <strong>{email}</strong>. <br />
          <strong>Por favor, revise su carpeta de spam o correo no deseado si no lo encuentra en su bandeja de entrada.</strong>
        </Typography>
        <Box component="form" onSubmit={handleVerificar} sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
          <TextField
            label="Código de Verificación"
            type="text"
            value={codigo}
            onChange={(e) => setCodigo(e.target.value)}
            fullWidth
            required
          />
          <Button type="submit" variant="contained" color="primary">
            Verificar
          </Button>
          <Button variant="contained" color="primary" onClick={handleReenviar}>
            Reenviar código
          </Button>
        </Box>
      </Container>
      <Snackbar
        open={snackbar.open}
        autoHideDuration={4000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
        anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
      >
        <Alert onClose={() => setSnackbar({ ...snackbar, open: false })} severity={snackbar.severity} sx={{ width: "100%" }}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
}
