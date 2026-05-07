import { useState } from "react";
import {
  Box, Container, Typography, TextField, Button, Grid, Paper,
  Select, MenuItem, FormControl, InputLabel, Alert, CircularProgress,
  Chip, Divider, List, ListItem, ListItemIcon, ListItemText,
} from "@mui/material";
import SearchIcon from "@mui/icons-material/Search";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import SpeedIcon from "@mui/icons-material/Speed";
import GroupsIcon from "@mui/icons-material/Groups";
import VerifiedIcon from "@mui/icons-material/Verified";
import EmailIcon from "@mui/icons-material/Email";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "";

const BENEFITS = [
  { icon: <SpeedIcon />, text: "Resultados en 24-48hs — usamos IA para encontrar los candidatos ideales" },
  { icon: <GroupsIcon />, text: "Base de datos con miles de CVs ya clasificados por rubro" },
  { icon: <VerifiedIcon />, text: "Candidatos pre-filtrados y verificados" },
  { icon: <EmailIcon />, text: "Contactamos a los candidatos por vos y te pasamos los interesados" },
];

export default function BusquedaServicio() {
  const [form, setForm] = useState({
    company_name: "", contact_name: "", contact_email: "", contact_phone: "",
    position: "", quantity: 1, requirements: "", urgency: "normal", location: "", notes: "",
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  const update = (field) => (e) => setForm((f) => ({ ...f, [field]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    try {
      const res = await fetch(`${API_BASE}/api/services/request-search`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });

      const data = await res.json();
      if (res.ok && data.checkout_url) {
        window.location.href = data.checkout_url;
      } else {
        setError(data.detail || "Error al procesar la solicitud");
      }
    } catch (err) {
      setError("Error de conexion. Intenta de nuevo.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Box sx={{ bgcolor: "background.default", minHeight: "100vh" }}>
      {/* Hero */}
      <Box sx={{
        background: "linear-gradient(135deg, #103B40 0%, #1a5c63 100%)",
        color: "#fff", py: 8, textAlign: "center",
      }}>
        <Container maxWidth="md">
          <Typography variant="h3" fontWeight={700} gutterBottom>
            Encontramos el personal que necesitas
          </Typography>
          <Typography variant="h6" sx={{ opacity: 0.9, mb: 2 }}>
            Decinos que puesto buscas y en 24-48hs te enviamos candidatos verificados
          </Typography>
          <Chip label="Desde $50.000" sx={{ bgcolor: "#D96236", color: "#fff", fontWeight: 600, fontSize: 16, py: 2.5, px: 1 }} />
        </Container>
      </Box>

      <Container maxWidth="lg" sx={{ py: 6 }}>
        <Grid container spacing={4}>
          {/* Benefits */}
          <Grid item xs={12} md={5}>
            <Typography variant="h5" fontWeight={600} gutterBottom>
              Como funciona
            </Typography>
            <List>
              {BENEFITS.map((b, i) => (
                <ListItem key={i} sx={{ py: 1.5 }}>
                  <ListItemIcon sx={{ color: "primary.main", minWidth: 40 }}>{b.icon}</ListItemIcon>
                  <ListItemText primary={b.text} />
                </ListItem>
              ))}
            </List>

            <Divider sx={{ my: 3 }} />

            <Typography variant="h6" fontWeight={600} gutterBottom>
              Que incluye el servicio
            </Typography>
            <List dense>
              {[
                "Busqueda en nuestra base de +1000 CVs",
                "Filtrado por rubro, experiencia y ubicacion",
                "Contacto directo con los candidatos",
                "Envio de los mejores perfiles a tu email",
                "Soporte durante el proceso de seleccion",
              ].map((text, i) => (
                <ListItem key={i} sx={{ py: 0.5 }}>
                  <ListItemIcon sx={{ minWidth: 32 }}>
                    <CheckCircleIcon fontSize="small" color="success" />
                  </ListItemIcon>
                  <ListItemText primary={text} primaryTypographyProps={{ variant: "body2" }} />
                </ListItem>
              ))}
            </List>
          </Grid>

          {/* Form */}
          <Grid item xs={12} md={7}>
            <Paper sx={{ p: 4, borderRadius: 3 }}>
              <Typography variant="h5" fontWeight={600} gutterBottom>
                <SearchIcon sx={{ mr: 1, verticalAlign: "middle" }} />
                Solicitar busqueda
              </Typography>

              <Box component="form" onSubmit={handleSubmit} sx={{ display: "flex", flexDirection: "column", gap: 2, mt: 2 }}>
                <Typography variant="subtitle2" color="text.secondary">Tu empresa</Typography>
                <Grid container spacing={2}>
                  <Grid item xs={12} sm={6}>
                    <TextField fullWidth required label="Nombre de la empresa" value={form.company_name} onChange={update("company_name")} />
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <TextField fullWidth required label="Nombre de contacto" value={form.contact_name} onChange={update("contact_name")} />
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <TextField fullWidth required type="email" label="Email" value={form.contact_email} onChange={update("contact_email")} />
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <TextField fullWidth required label="Telefono / WhatsApp" value={form.contact_phone} onChange={update("contact_phone")} />
                  </Grid>
                </Grid>

                <Divider sx={{ my: 1 }} />
                <Typography variant="subtitle2" color="text.secondary">Que buscas</Typography>

                <TextField fullWidth required label="Puesto que necesitas" placeholder="ej: Mozo, Guardia de seguridad, Administrativa..." value={form.position} onChange={update("position")} />

                <Grid container spacing={2}>
                  <Grid item xs={6}>
                    <TextField fullWidth type="number" label="Cantidad de personas" value={form.quantity} onChange={update("quantity")} inputProps={{ min: 1 }} />
                  </Grid>
                  <Grid item xs={6}>
                    <FormControl fullWidth>
                      <InputLabel>Urgencia</InputLabel>
                      <Select value={form.urgency} label="Urgencia" onChange={update("urgency")}>
                        <MenuItem value="urgente">Urgente (24hs)</MenuItem>
                        <MenuItem value="normal">Normal (48hs)</MenuItem>
                        <MenuItem value="flexible">Flexible (1 semana)</MenuItem>
                      </Select>
                    </FormControl>
                  </Grid>
                </Grid>

                <TextField fullWidth multiline rows={3} label="Requisitos" placeholder="Edad, experiencia, disponibilidad horaria, zona..." value={form.requirements} onChange={update("requirements")} />

                <TextField fullWidth label="Zona / Ubicacion" placeholder="ej: Godoy Cruz, Mendoza" value={form.location} onChange={update("location")} />

                <TextField fullWidth multiline rows={2} label="Notas adicionales (opcional)" value={form.notes} onChange={update("notes")} />

                {error && <Alert severity="error">{error}</Alert>}

                <Button type="submit" variant="contained" size="large" disabled={submitting}
                  startIcon={submitting ? <CircularProgress size={20} color="inherit" /> : <SearchIcon />}
                  sx={{ py: 1.5, fontSize: 16 }}>
                  {submitting ? "Procesando..." : "Solicitar busqueda — $50.000"}
                </Button>

                <Typography variant="caption" color="text.secondary" textAlign="center">
                  El pago se procesa de forma segura a traves de MercadoPago.
                  Una vez confirmado, comenzamos la busqueda inmediatamente.
                </Typography>
              </Box>
            </Paper>
          </Grid>
        </Grid>
      </Container>
    </Box>
  );
}
