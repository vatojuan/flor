import { useState } from "react";
import {
  Box, Container, Typography, TextField, Button, Grid, Paper,
  Select, MenuItem, FormControl, InputLabel, Alert, CircularProgress,
  Chip, Divider, List, ListItem, ListItemIcon, ListItemText,
  Radio, RadioGroup, FormControlLabel, Card, CardContent,
} from "@mui/material";
import SearchIcon from "@mui/icons-material/Search";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import SpeedIcon from "@mui/icons-material/Speed";
import GroupsIcon from "@mui/icons-material/Groups";
import VerifiedIcon from "@mui/icons-material/Verified";
import EmailIcon from "@mui/icons-material/Email";
import StarIcon from "@mui/icons-material/Star";
import VideocamIcon from "@mui/icons-material/Videocam";
import MainLayout from "../../components/MainLayout";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "";

export default function BusquedaServicio() {
  const [form, setForm] = useState({
    company_name: "", contact_name: "", contact_email: "", contact_phone: "",
    position: "", quantity: 1, requirements: "", urgency: "normal",
    service_type: "busqueda", location: "", notes: "",
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  const update = (field) => (e) => setForm((f) => ({ ...f, [field]: e.target.value }));
  const price = form.service_type === "seleccion" ? 120000 : 50000;

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
    } catch {
      setError("Error de conexion. Intenta de nuevo.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <MainLayout>
      <Box sx={{ bgcolor: "background.default", minHeight: "100vh" }}>
        {/* Hero */}
        <Box sx={{ background: "linear-gradient(135deg, #103B40 0%, #1a5c63 100%)", color: "#fff", py: 8, textAlign: "center" }}>
          <Container maxWidth="md">
            <Typography variant="h3" fontWeight={700} gutterBottom>
              Encontramos el personal que necesitas
            </Typography>
            <Typography variant="h6" sx={{ opacity: 0.9, mb: 2 }}>
              Decinos que puesto buscas y en 24-48hs te enviamos candidatos verificados
            </Typography>
            <Box sx={{ display: "flex", gap: 2, justifyContent: "center" }}>
              <Chip label="Busqueda: $50.000" sx={{ bgcolor: "rgba(255,255,255,0.2)", color: "#fff", fontWeight: 600, fontSize: 14, py: 2, px: 1 }} />
              <Chip icon={<StarIcon sx={{ color: "#FFB300 !important" }} />} label="Seleccion completa: $120.000"
                sx={{ bgcolor: "#D96236", color: "#fff", fontWeight: 600, fontSize: 14, py: 2, px: 1 }} />
            </Box>
          </Container>
        </Box>

        <Container maxWidth="lg" sx={{ py: 6 }}>
          <Grid container spacing={4}>
            {/* Left: Plans comparison */}
            <Grid item xs={12} md={5}>
              <Typography variant="h5" fontWeight={600} gutterBottom>
                Dos niveles de servicio
              </Typography>

              <Paper sx={{ p: 3, mb: 3, borderRadius: 2 }}>
                <Typography variant="h6" fontWeight={600} gutterBottom>
                  <SearchIcon sx={{ mr: 1, verticalAlign: "middle", color: "primary.main" }} />
                  Busqueda — $50.000
                </Typography>
                <List dense>
                  {[
                    "Busqueda con IA en nuestra base de +1000 CVs",
                    "Filtrado por rubro, experiencia y ubicacion",
                    "Contacto directo con los candidatos",
                    "Te enviamos los CVs de los mejores perfiles",
                    "Resultados en 24-48hs",
                  ].map((t, i) => (
                    <ListItem key={i} sx={{ py: 0.3 }}>
                      <ListItemIcon sx={{ minWidth: 28 }}><CheckCircleIcon fontSize="small" color="success" /></ListItemIcon>
                      <ListItemText primary={t} primaryTypographyProps={{ variant: "body2" }} />
                    </ListItem>
                  ))}
                </List>
              </Paper>

              <Paper sx={{ p: 3, borderRadius: 2, border: "2px solid #D96236" }}>
                <Typography variant="h6" fontWeight={600} gutterBottom>
                  <StarIcon sx={{ mr: 1, verticalAlign: "middle", color: "#FFB300" }} />
                  Seleccion completa — $120.000
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                  Todo lo de busqueda, mas:
                </Typography>
                <List dense>
                  {[
                    "Entrevistas pre-filtro por videollamada",
                    "Evaluacion de competencias y experiencia",
                    "Informe de cada candidato entrevistado",
                    "Te pasamos solo los 3 mejores ya evaluados",
                    "Garantia: si no funciona en 30 dias, buscamos otro",
                  ].map((t, i) => (
                    <ListItem key={i} sx={{ py: 0.3 }}>
                      <ListItemIcon sx={{ minWidth: 28 }}><CheckCircleIcon fontSize="small" color="primary" /></ListItemIcon>
                      <ListItemText primary={t} primaryTypographyProps={{ variant: "body2" }} />
                    </ListItem>
                  ))}
                </List>
              </Paper>
            </Grid>

            {/* Right: Form */}
            <Grid item xs={12} md={7}>
              <Paper sx={{ p: 4, borderRadius: 3 }}>
                <Typography variant="h5" fontWeight={600} gutterBottom>
                  Solicitar servicio
                </Typography>

                <Box component="form" onSubmit={handleSubmit} sx={{ display: "flex", flexDirection: "column", gap: 2, mt: 2 }}>
                  {/* Plan selection */}
                  <Typography variant="subtitle2" color="text.secondary">Tipo de servicio</Typography>
                  <RadioGroup value={form.service_type} onChange={update("service_type")}>
                    <Card variant="outlined" sx={{ mb: 1, borderColor: form.service_type === "busqueda" ? "primary.main" : "divider" }}>
                      <CardContent sx={{ display: "flex", alignItems: "center", gap: 2, py: 1, "&:last-child": { pb: 1 } }}>
                        <FormControlLabel value="busqueda" control={<Radio />} label="" sx={{ m: 0 }} />
                        <SearchIcon color="action" />
                        <Box sx={{ flexGrow: 1 }}>
                          <Typography fontWeight={600}>Busqueda</Typography>
                          <Typography variant="caption" color="text.secondary">Te enviamos CVs de candidatos compatibles</Typography>
                        </Box>
                        <Chip label="$50.000" size="small" />
                      </CardContent>
                    </Card>
                    <Card variant="outlined" sx={{ borderColor: form.service_type === "seleccion" ? "primary.main" : "divider", borderWidth: form.service_type === "seleccion" ? 2 : 1 }}>
                      <CardContent sx={{ display: "flex", alignItems: "center", gap: 2, py: 1, "&:last-child": { pb: 1 } }}>
                        <FormControlLabel value="seleccion" control={<Radio />} label="" sx={{ m: 0 }} />
                        <VideocamIcon sx={{ color: "#FFB300" }} />
                        <Box sx={{ flexGrow: 1 }}>
                          <Typography fontWeight={600}>Seleccion completa</Typography>
                          <Typography variant="caption" color="text.secondary">Busqueda + entrevistas + los 3 mejores evaluados</Typography>
                        </Box>
                        <Chip label="$120.000" color="primary" size="small" />
                      </CardContent>
                    </Card>
                  </RadioGroup>

                  <Divider sx={{ my: 1 }} />
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

                  <TextField fullWidth required label="Puesto que necesitas" placeholder="ej: Mozo, Guardia de seguridad, Administrativa..."
                    value={form.position} onChange={update("position")} />

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

                  <TextField fullWidth multiline rows={3} label="Requisitos" placeholder="Edad, experiencia, disponibilidad horaria, zona..."
                    value={form.requirements} onChange={update("requirements")} />

                  <TextField fullWidth label="Zona / Ubicacion" placeholder="ej: Godoy Cruz, Mendoza" value={form.location} onChange={update("location")} />

                  <TextField fullWidth multiline rows={2} label="Notas adicionales (opcional)" value={form.notes} onChange={update("notes")} />

                  {error && <Alert severity="error">{error}</Alert>}

                  <Button type="submit" variant="contained" size="large" disabled={submitting}
                    startIcon={submitting ? <CircularProgress size={20} color="inherit" /> : <SearchIcon />}
                    sx={{ py: 1.5, fontSize: 16 }}>
                    {submitting ? "Procesando..." : `Solicitar ${form.service_type === "seleccion" ? "seleccion completa" : "busqueda"} — $${price.toLocaleString()}`}
                  </Button>

                  <Typography variant="caption" color="text.secondary" textAlign="center">
                    El pago se procesa de forma segura a traves de MercadoPago.
                    Una vez confirmado, comenzamos inmediatamente.
                  </Typography>
                </Box>
              </Paper>
            </Grid>
          </Grid>
        </Container>
      </Box>
    </MainLayout>
  );
}
