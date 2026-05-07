// pages/soluciones/outsourcing.js
import { useState } from "react";
import {
  Container, Typography, IconButton, Box, Grid, Card, CardContent,
  List, ListItem, ListItemIcon, ListItemText, Paper, Button, Divider,
  TextField, Select, MenuItem, FormControl, InputLabel, Alert, CircularProgress,
} from "@mui/material";
import MainLayout from "../../components/MainLayout";
import ArrowForwardIosIcon from "@mui/icons-material/ArrowForwardIos";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import SendIcon from "@mui/icons-material/Send";
import { useRouter } from "next/router";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "";

export default function Outsourcing() {
  const router = useRouter();
  const handleNext = () => router.push("/soluciones/talent_management");

  const [form, setForm] = useState({
    company_name: "", contact_name: "", contact_email: "", contact_phone: "",
    positions: "", duration: "indefinido", requirements: "", location: "", notes: "",
  });
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState(null);

  const update = (field) => (e) => setForm((f) => ({ ...f, [field]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setResult(null);
    try {
      const res = await fetch(`${API_BASE}/api/services/request-outsourcing`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (res.ok) {
        setResult({ severity: "success", text: "Solicitud enviada. Nos pondremos en contacto a la brevedad." });
        setForm({ company_name: "", contact_name: "", contact_email: "", contact_phone: "",
          positions: "", duration: "indefinido", requirements: "", location: "", notes: "" });
      } else {
        setResult({ severity: "error", text: data.detail || "Error al enviar" });
      }
    } catch {
      setResult({ severity: "error", text: "Error de conexion" });
    } finally {
      setSubmitting(false);
    }
  };

  const servicios = [
    {
      titulo: "Payroll Specialist (Responsable de Nominas)",
      resumen: "Gestion integral y conforme a normativas para asegurar procesos precisos y oportunos.",
      bullets: [
        "Determinar el salario bruto y neto",
        "Incluir horas extra, bonos, descuentos y comisiones",
        "Aplicar retenciones y cargas sociales correspondientes",
        "Generar y revisar la nomina periodicamente",
        "Coordinar transferencias bancarias o emision de cheques",
        "Entregar recibos de sueldo a los empleados",
      ],
    },
    {
      titulo: "Community Manager",
      resumen: "Construye una comunidad digital activa y comprometida alrededor de tu marca.",
      bullets: [
        "Estrategia y calendarios de contenido",
        "Diseno de piezas visuales y copywriting",
        "Gestion de la comunidad y atencion a usuarios",
        "Campanas publicitarias en redes",
      ],
    },
    {
      titulo: "Catering Corporativo",
      resumen: "Soluciones gastronomicas adaptadas a eventos, reuniones y capacitaciones.",
      bullets: [
        "Catering para eventos corporativos y reuniones",
        "Menus saludables y personalizados",
        "Provision de bebidas y snacks",
        "Servicio de montaje y logistica in-situ",
      ],
    },
    {
      titulo: "Software Factory",
      resumen: "Productos digitales end-to-end para acelerar la innovacion en tu organizacion.",
      bullets: [
        "Analisis y diseno de soluciones a medida",
        "Desarrollo web y desktop robusto",
        "Aplicaciones moviles nativas o hibridas",
        "Integracion de sistemas y plataformas",
        "Mantenimiento, soporte y evolucion continua",
      ],
    },
  ];

  const beneficios = [
    "Enfoque en el core de tu negocio",
    "Expertos especializados sin sobrecargar tu staff",
    "Eficiencia operativa y ahorro de costos",
    "Flexibilidad y escalabilidad del servicio",
  ];

  const comoFunciona = [
    { paso: "1", titulo: "Contanos que necesitas", desc: "Completa el formulario con los puestos que necesitas cubrir" },
    { paso: "2", titulo: "Armamos tu equipo", desc: "Buscamos, seleccionamos y contratamos al personal ideal" },
    { paso: "3", titulo: "Nosotros nos encargamos", desc: "FAP se ocupa de sueldos, cargas sociales, ART y administracion" },
    { paso: "4", titulo: "Vos te enfocas en tu negocio", desc: "Recibes personal listo para trabajar, sin complicaciones" },
  ];

  return (
    <MainLayout>
      {/* Hero */}
      <Box sx={{ background: "linear-gradient(135deg,#0B2A2D 0%, #103B40 50%, #155158 100%)", color: "#FFF", py: { xs: 6, md: 8 } }}>
        <Container maxWidth="lg" sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <Box>
            <Typography variant="h5">Outsourcing</Typography>
            <Typography variant="h2" sx={{ fontWeight: 700, mt: 1, lineHeight: 1.2 }}>
              Expertos externos
              <br />
              para tu eficiencia
            </Typography>
          </Box>
          <IconButton onClick={handleNext} sx={{ color: "#FFF" }}>
            <ArrowForwardIosIcon fontSize="large" />
          </IconButton>
        </Container>
      </Box>

      <Container maxWidth="lg" sx={{ py: 8 }}>
        {/* Intro */}
        <Paper elevation={0} sx={{ p: { xs: 3, md: 4 }, mb: 6, backgroundColor: "rgba(16,59,64,0.85)", color: "#FFF" }}>
          <Typography variant="h5" sx={{ fontWeight: 600, mb: 2 }}>
            Nosotros contratamos, vos te enfocas en tu negocio
          </Typography>
          <Typography variant="body1" paragraph>
            Con el servicio de outsourcing de FAP, no necesitas preocuparte por buscar personal,
            hacer contratos, pagar sueldos ni gestionar cargas sociales. Nosotros nos encargamos
            de todo. Vos solo nos decis que necesitas y nosotros ponemos al personal a trabajar en tu empresa.
          </Typography>
          <Button variant="contained" size="large" href="#solicitar">
            Solicitar outsourcing
          </Button>
        </Paper>

        {/* Como funciona */}
        <Box sx={{ mb: 8 }}>
          <Typography variant="h4" gutterBottom>Como funciona</Typography>
          <Grid container spacing={3}>
            {comoFunciona.map((item) => (
              <Grid item xs={12} sm={6} md={3} key={item.paso}>
                <Paper sx={{ p: 3, textAlign: "center", height: "100%", borderTop: "4px solid #D96236" }}>
                  <Typography variant="h3" color="primary" sx={{ fontWeight: 700, mb: 1 }}>{item.paso}</Typography>
                  <Typography variant="h6" sx={{ mb: 1 }}>{item.titulo}</Typography>
                  <Typography variant="body2" color="text.secondary">{item.desc}</Typography>
                </Paper>
              </Grid>
            ))}
          </Grid>
        </Box>

        {/* Servicios */}
        <Box sx={{ mb: 8 }}>
          <Typography variant="h4" gutterBottom>Nuestros servicios</Typography>
          <Grid container spacing={4}>
            {servicios.map((s, i) => (
              <Grid item xs={12} md={6} key={i}>
                <Card elevation={3} sx={{ height: "100%", borderTop: "6px solid #D96236", backgroundColor: "#12383C", color: "#FFF" }}>
                  <CardContent>
                    <Typography variant="h6" gutterBottom>{s.titulo}</Typography>
                    <Typography variant="body2" sx={{ mb: 1.5 }}>{s.resumen}</Typography>
                    <Divider sx={{ mb: 1, backgroundColor: "rgba(255,255,255,0.2)" }} />
                    <List dense>
                      {s.bullets.map((b, idx) => (
                        <ListItem key={idx} sx={{ pl: 0 }}>
                          <ListItemIcon sx={{ minWidth: 28 }}><CheckCircleIcon color="primary" fontSize="small" /></ListItemIcon>
                          <ListItemText primary={b} />
                        </ListItem>
                      ))}
                    </List>
                  </CardContent>
                </Card>
              </Grid>
            ))}
          </Grid>
        </Box>

        {/* Beneficios */}
        <Box sx={{ mb: 8 }}>
          <Typography variant="h4" gutterBottom>Beneficios</Typography>
          <Grid container spacing={2}>
            {beneficios.map((b, i) => (
              <Grid item xs={12} md={6} key={i}>
                <Box sx={{ display: "flex", alignItems: "center" }}>
                  <CheckCircleIcon color="primary" sx={{ mr: 1 }} />
                  <Typography variant="body1" sx={{ fontWeight: 500 }}>{b}</Typography>
                </Box>
              </Grid>
            ))}
          </Grid>
        </Box>

        {/* Formulario de solicitud */}
        <Paper id="solicitar" sx={{ p: 4, borderRadius: 3, border: "2px solid #D96236" }}>
          <Typography variant="h4" sx={{ mb: 1, fontWeight: 600 }}>
            Solicitar Outsourcing
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
            Completá el formulario y nos ponemos en contacto para armar tu equipo.
            Sin compromiso, sin costo inicial.
          </Typography>

          <Box component="form" onSubmit={handleSubmit} sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
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
            <Typography variant="subtitle2" color="text.secondary">Que personal necesitas</Typography>

            <TextField fullWidth required label="Puestos que necesitas" placeholder="ej: 3 mozos, 2 recepcionistas, 1 cocinero..."
              value={form.positions} onChange={update("positions")} />

            <Grid container spacing={2}>
              <Grid item xs={12} sm={6}>
                <FormControl fullWidth>
                  <InputLabel>Duracion</InputLabel>
                  <Select value={form.duration} label="Duracion" onChange={update("duration")}>
                    <MenuItem value="temporal">Temporal (dias/semanas)</MenuItem>
                    <MenuItem value="indefinido">Indefinido</MenuItem>
                    <MenuItem value="a definir">A definir</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField fullWidth label="Ubicacion" placeholder="ej: Ciudad de Mendoza" value={form.location} onChange={update("location")} />
              </Grid>
            </Grid>

            <TextField fullWidth multiline rows={3} label="Requisitos o detalles adicionales"
              placeholder="Horarios, experiencia, uniformes, etc." value={form.requirements} onChange={update("requirements")} />

            <TextField fullWidth multiline rows={2} label="Notas (opcional)" value={form.notes} onChange={update("notes")} />

            {result && <Alert severity={result.severity}>{result.text}</Alert>}

            <Button type="submit" variant="contained" size="large" disabled={submitting}
              startIcon={submitting ? <CircularProgress size={20} color="inherit" /> : <SendIcon />}
              sx={{ py: 1.5, fontSize: 16 }}>
              {submitting ? "Enviando..." : "Solicitar outsourcing (sin costo)"}
            </Button>

            <Typography variant="caption" color="text.secondary" textAlign="center">
              Un asesor de FAP se pondra en contacto para definir los detalles del servicio.
            </Typography>
          </Box>
        </Paper>
      </Container>
    </MainLayout>
  );
}
