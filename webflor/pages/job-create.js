// pages/job-create.jsx  (ó /pages/job/create.jsx)
// ------------------------------------------------

import { useState, useEffect } from "react";
import { useRouter } from "next/router";
import { useSession } from "next-auth/react";
import {
  Box,
  Container,
  Typography,
  TextField,
  Button,
  Snackbar,
  Alert,
  Select,
  MenuItem,
  InputLabel,
  FormControl,
} from "@mui/material";

export default function JobCreate() {
  const router = useRouter();
  const { data: session, status } = useSession();

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [requirements, setRequirements] = useState("");

  // Expiración
  const [expirationOption, setExpirationOption] = useState("7d");
  const [manualExpirationDate, setManualExpirationDate] = useState("");

  const [snackbar, setSnackbar] = useState({
    open: false,
    message: "",
    severity: "success",
  });

  /* ───────────────────────── redirecciones ───────────────────────── */
  useEffect(() => {
    if (status !== "loading" && !session) {
      router.push("/login");
    } else if (session && !session.user.role) {
      router.push("/select-role");
    }
  }, [session, status, router]);

  /* ───────────────────── helpers de expiración ───────────────────── */
  const computeExpirationDate = () => {
    const now = new Date();
    switch (expirationOption) {
      case "24h":
        now.setHours(now.getHours() + 24);
        return now;
      case "3d":
        now.setDate(now.getDate() + 3);
        return now;
      case "7d":
        now.setDate(now.getDate() + 7);
        return now;
      case "15d":
        now.setDate(now.getDate() + 15);
        return now;
      case "1m":
        now.setMonth(now.getMonth() + 1);
        return now;
      case "manual":
        return manualExpirationDate ? new Date(manualExpirationDate) : null;
      default:
        return null;
    }
  };

  /* ────────────────────── submit ────────────────────── */
  const handleSubmit = async (e) => {
    e.preventDefault();

    // 1. Token JWT necesario para /api/job/create (FastAPI)
    const jwt =
      session?.accessToken ||
      session?.token ||
      (typeof window !== "undefined" && localStorage.getItem("userToken"));

    if (!jwt) {
      setSnackbar({
        open: true,
        message: "No se encontró token de autenticación. Inicia sesión de nuevo.",
        severity: "error",
      });
      return;
    }

    // 2. Calculamos expiración
    const expirationDate = expirationOption ? computeExpirationDate() : null;

    // 3. URL del backend (usa variable de entorno en producción)
    const apiBase = process.env.NEXT_PUBLIC_API_URL || "";

    try {
      const res = await fetch(`${apiBase}/api/job/create`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${jwt}`,
        },
        body: JSON.stringify({
          title,
          description,
          requirements,
          userId: Number(session.user.id),
          expirationDate: expirationDate ? expirationDate.toISOString() : null,
        }),
      });

      if (res.ok) {
        setSnackbar({
          open: true,
          message: "Oferta publicada",
          severity: "success",
        });
        setTimeout(() => router.push("/job-list"), 2000);
      } else {
        const data = await res.json();
        setSnackbar({
          open: true,
          message: `Error al publicar oferta: ${data.detail || data.message}`,
          severity: "error",
        });
      }
    } catch (err) {
      setSnackbar({
        open: true,
        message: "Error de red. Intenta nuevamente.",
        severity: "error",
      });
    }
  };

  const handleCancel = () => router.push("/dashboard");

  if (status === "loading" || !session) {
    return (
      <Typography align="center" sx={{ mt: 4 }}>
        Cargando...
      </Typography>
    );
  }

  /* ────────────────────────── UI ────────────────────────── */
  return (
    <Container maxWidth="sm" sx={{ mt: 4, textAlign: "center" }}>
      <Typography variant="h4" gutterBottom>
        Publicar Oferta de Empleo
      </Typography>

      <Box
        component="form"
        onSubmit={handleSubmit}
        sx={{ display: "flex", flexDirection: "column", gap: 2 }}
      >
        <TextField
          label="Título"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          required
          fullWidth
        />

        <TextField
          label="Descripción"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          required
          multiline
          rows={4}
          fullWidth
        />

        <TextField
          label="Requisitos"
          value={requirements}
          onChange={(e) => setRequirements(e.target.value)}
          multiline
          rows={3}
          fullWidth
        />

        {/* Expiración */}
        <FormControl fullWidth>
          <InputLabel id="expiration-label">Expiración</InputLabel>
          <Select
            labelId="expiration-label"
            value={expirationOption}
            label="Expiración"
            onChange={(e) => setExpirationOption(e.target.value)}
          >
            <MenuItem value="24h">24 horas</MenuItem>
            <MenuItem value="3d">3 días</MenuItem>
            <MenuItem value="7d">7 días</MenuItem>
            <MenuItem value="15d">15 días</MenuItem>
            <MenuItem value="1m">1 mes</MenuItem>
            <MenuItem value="manual">Fecha manual</MenuItem>
          </Select>
        </FormControl>

        {expirationOption === "manual" && (
          <TextField
            label="Fecha de Expiración"
            type="date"
            value={manualExpirationDate}
            onChange={(e) => setManualExpirationDate(e.target.value)}
            InputLabelProps={{ shrink: true }}
            fullWidth
          />
        )}

        {/* Botones */}
        <Box sx={{ display: "flex", justifyContent: "space-between", mt: 2 }}>
          <Button type="submit" variant="contained" color="primary">
            Publicar Oferta
          </Button>
          <Button variant="outlined" onClick={handleCancel}>
            Cancelar
          </Button>
        </Box>
      </Box>

      {/* Snackbar */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={4000}
        onClose={() => setSnackbar((s) => ({ ...s, open: false }))}
        anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
      >
        <Alert
          severity={snackbar.severity}
          variant="filled"
          sx={{ width: "100%" }}
          onClose={() => setSnackbar((s) => ({ ...s, open: false }))}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Container>
  );
}
