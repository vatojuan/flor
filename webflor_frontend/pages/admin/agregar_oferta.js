import React, { useState, useEffect } from "react";
import { useRouter } from "next/router";
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
  FormControlLabel,
  Checkbox,
  CircularProgress
} from "@mui/material";
import DashboardLayout from "../../components/DashboardLayout";
import useAdminAuth from "../../hooks/useAdminAuth";

export default function AgregarOferta({ toggleDarkMode, currentMode }) {
  const { user, loading } = useAdminAuth();
  const router = useRouter();
  const adminId = user?.id;

  const [form, setForm] = useState({
    title: "",
    description: "",
    requirements: "",
    expirationOption: "7d",
    manualDate: "",
    label: "automatic",
    source: "admin",
    isPaid: false,
    contactEmail: "",
    contactPhone: ""
  });
  const [submitting, setSubmitting] = useState(false);
  const [snackbar, setSnackbar] = useState({ open: false, message: "", severity: "success" });

  useEffect(() => {
    if (!loading && !user) router.push("/admin/login");
  }, [loading, user, router]);

  if (loading || !user) {
    return <Typography align="center" sx={{ mt: 4 }}>Cargando...</Typography>;
  }

  const computeExpiration = () => {
    const now = new Date();
    switch (form.expirationOption) {
      case "24h": now.setHours(now.getHours() + 24); break;
      case "3d": now.setDate(now.getDate() + 3); break;
      case "7d": now.setDate(now.getDate() + 7); break;
      case "15d": now.setDate(now.getDate() + 15); break;
      case "1m": now.setMonth(now.getMonth() + 1); break;
      case "manual": return form.manualDate ? new Date(form.manualDate) : null;
      default: return null;
    }
    return now;
  };

  const handleChange = (field) => (e) => {
    const value = e.target.type === "checkbox" ? e.target.checked : e.target.value;
    setForm(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!adminId) return;
    setSubmitting(true);

    const expiration = computeExpiration();
    const payload = {
      title: form.title,
      description: form.description,
      requirements: form.requirements,
      expirationDate: expiration ? expiration.toISOString() : null,
      userId: adminId,
      // Usamos siempre la etiqueta seleccionada
      label: form.label,
      source: form.source,
      isPaid: form.isPaid,
      contactEmail: form.contactEmail || undefined,
      contactPhone: form.contactPhone || undefined
    };

    try {
      const token = localStorage.getItem("adminToken");
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/job/create-admin`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });
      if (res.ok) {
        setSnackbar({ open: true, message: "Oferta publicada con éxito", severity: "success" });
        setTimeout(() => router.push("/admin/mis_ofertas"), 1500);
      } else {
        const error = await res.json();
        setSnackbar({ open: true, message: error.detail || "Error al publicar", severity: "error" });
      }
    } catch {
      setSnackbar({ open: true, message: "Error de red", severity: "error" });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <DashboardLayout toggleDarkMode={toggleDarkMode} currentMode={currentMode}>
      <Container maxWidth="sm" sx={{ mt: 4 }}>
        <Typography variant="h4" gutterBottom align="center">Publicar Oferta</Typography>
        <Box component="form" onSubmit={handleSubmit} sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
          <TextField label="Título" value={form.title} onChange={handleChange("title")} required fullWidth />
          <TextField label="Descripción" value={form.description} onChange={handleChange("description")} required multiline rows={4} fullWidth />
          <TextField label="Requisitos" value={form.requirements} onChange={handleChange("requirements")} required multiline rows={3} fullWidth />

          <FormControl fullWidth>
            <InputLabel id="exp-label">Expiración</InputLabel>
            <Select labelId="exp-label" value={form.expirationOption} label="Expiración" onChange={handleChange("expirationOption")}>
              <MenuItem value="24h">24 horas</MenuItem>
              <MenuItem value="3d">3 días</MenuItem>
              <MenuItem value="7d">7 días</MenuItem>
              <MenuItem value="15d">15 días</MenuItem>
              <MenuItem value="1m">1 mes</MenuItem>
              <MenuItem value="manual">Fecha manual</MenuItem>
            </Select>
          </FormControl>
          {form.expirationOption === "manual" && (
            <TextField
              label="Fecha de expiración"
              type="date"
              value={form.manualDate}
              onChange={handleChange("manualDate")}
              InputLabelProps={{ shrink: true }}
              fullWidth
            />
          )}

          <FormControl fullWidth>
            <InputLabel id="label-label">Etiqueta</InputLabel>
            <Select labelId="label-label" value={form.label} label="Etiqueta" onChange={handleChange("label")}>
              <MenuItem value="automatic">Automático</MenuItem>
              <MenuItem value="manual">Manual</MenuItem>
            </Select>
          </FormControl>

          <FormControl fullWidth>
            <InputLabel id="source-label">Fuente</InputLabel>
            <Select labelId="source-label" value={form.source} label="Fuente" onChange={handleChange("source")}>
              <MenuItem value="employer">Empleador</MenuItem>
              <MenuItem value="admin">Administrador</MenuItem>
              <MenuItem value="social">Red Social</MenuItem>
            </Select>
          </FormControl>

          <TextField label="Email de contacto" type="email" value={form.contactEmail} onChange={handleChange("contactEmail")} fullWidth />
          <TextField label="Teléfono de contacto" value={form.contactPhone} onChange={handleChange("contactPhone")} fullWidth />

          <FormControlLabel
            control={<Checkbox checked={form.isPaid} onChange={handleChange("isPaid")} />}
            label="Oferta pagada"
          />

          <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mt: 2 }}>
            <Button
              type="submit"
              variant="contained"
              disabled={submitting}
              startIcon={submitting ? <CircularProgress size={20} /> : null}
            >
              {submitting ? "Publicando..." : "Publicar"}
            </Button>
            <Button variant="outlined" onClick={() => router.push("/admin/dashboard")}>Cancelar</Button>
          </Box>
        </Box>

        <Snackbar
          open={snackbar.open}
          autoHideDuration={4000}
          onClose={() => setSnackbar(s => ({ ...s, open: false }))}
        >
          <Alert severity={snackbar.severity} variant="filled">
            {snackbar.message}
          </Alert>
        </Snackbar>
      </Container>
    </DashboardLayout>
  );
}

// Forzar SSR
export async function getServerSideProps() {
  return { props: {} };
}
