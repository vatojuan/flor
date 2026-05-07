// pages/contacto.js
import Link from "next/link";
import { useState } from "react";
import {
  Box,
  Container,
  Typography,
  TextField,
  Button,
  Snackbar,
  Alert,
  Paper
} from "@mui/material";
import MainLayout from "../components/MainLayout";

export default function Contacto() {
  const [formData, setFormData] = useState({ nombre: "", email: "", mensaje: "" });
  const [snackbar, setSnackbar] = useState({ open: false, message: "", severity: "success" });

  const handleChange = (e) =>
    setFormData({ ...formData, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.nombre || !formData.email || !formData.mensaje) {
      setSnackbar({
        open: true,
        message: "Todos los campos son obligatorios",
        severity: "warning",
      });
      return;
    }

    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });
      const data = await res.json();
      setSnackbar({
        open: true,
        message: res.ok ? data.message : data.message || "Error al enviar",
        severity: res.ok ? "success" : "error",
      });
      if (res.ok) setFormData({ nombre: "", email: "", mensaje: "" });
    } catch (error) {
      console.error(error);
      setSnackbar({ open: true, message: "Error al enviar el mensaje", severity: "error" });
    }
  };

  return (
    <MainLayout>
      {/* Sección centrada */}
      <Box
        sx={{
          flexGrow: 1,
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          py: 8,
        }}
      >
        <Container maxWidth="sm">
          {/* Títulos y descripción */}
          <Typography variant="h3" gutterBottom color="common.white" align="center">
            Contáctanos
          </Typography>
          <Typography
            variant="body1"
            align="center"
            sx={{ mb: 4, color: "rgba(255,255,255,0.85)" }}
          >
            Completa el formulario y nos pondremos en contacto contigo lo antes posible.
          </Typography>

          {/* Formulario */}
          <Paper elevation={4} sx={{
            p: 4,
            backgroundColor: "rgba(16,59,64,0.85)",
            color: "#FFF",
            borderRadius: 3,
            border: "1px solid rgba(255,255,255,0.1)",
          }}>
            <Box
              component="form"
              onSubmit={handleSubmit}
              sx={{
                display: "flex", flexDirection: "column", gap: 3,
                "& .MuiTextField-root": {
                  "& .MuiOutlinedInput-root": {
                    color: "#FFF",
                    "& fieldset": { borderColor: "rgba(255,255,255,0.3)" },
                    "&:hover fieldset": { borderColor: "rgba(255,255,255,0.5)" },
                    "&.Mui-focused fieldset": { borderColor: "#D96236" },
                  },
                  "& .MuiInputLabel-root": { color: "rgba(255,255,255,0.6)" },
                  "& .MuiInputLabel-root.Mui-focused": { color: "#D96236" },
                },
              }}
            >
              <TextField
                label="Nombre"
                name="nombre"
                value={formData.nombre}
                onChange={handleChange}
                fullWidth
                required
              />
              <TextField
                label="Correo Electrónico"
                name="email"
                type="email"
                value={formData.email}
                onChange={handleChange}
                fullWidth
                required
              />
              <TextField
                label="Mensaje"
                name="mensaje"
                multiline
                rows={4}
                value={formData.mensaje}
                onChange={handleChange}
                fullWidth
                required
              />
              <Button type="submit" variant="contained" size="large">
                Enviar Mensaje
              </Button>
            </Box>
          </Paper>

          {/* Volver al inicio */}
          <Box textAlign="center" sx={{ mt: 3 }}>
            <Button component={Link} href="/" variant="text" sx={{ color: "#FFF" }}>
              ← Volver al Inicio
            </Button>
          </Box>
        </Container>
      </Box>

      {/* Snackbar de notificaciones */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={4000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
        anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
      >
        <Alert
          onClose={() => setSnackbar({ ...snackbar, open: false })}
          severity={snackbar.severity}
          sx={{ width: "100%" }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </MainLayout>
  );
}
