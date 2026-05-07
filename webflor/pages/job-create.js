import { useState, useEffect } from "react";
import { useRouter } from "next/router";
import { useSession } from "next-auth/react";
import {
  Box, Container, Typography, TextField, Button, Snackbar, Alert,
  Select, MenuItem, InputLabel, FormControl, Paper, Chip, Divider,
  Card, CardContent, CardActions, Radio, RadioGroup, FormControlLabel,
} from "@mui/material";
import StarIcon from "@mui/icons-material/Star";
import WorkIcon from "@mui/icons-material/Work";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "";

export default function JobCreate() {
  const router = useRouter();
  const { data: session, status } = useSession();

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [requirements, setRequirements] = useState("");
  const [expirationOption, setExpirationOption] = useState("7d");
  const [manualExpirationDate, setManualExpirationDate] = useState("");
  const [planType, setPlanType] = useState("free"); // "free" or "featured"
  const [submitting, setSubmitting] = useState(false);
  const [snackbar, setSnackbar] = useState({ open: false, message: "", severity: "success" });

  useEffect(() => {
    if (status !== "loading" && !session) router.push("/login");
    else if (session && !session.user.role) router.push("/select-role");
  }, [session, status, router]);

  const computeExpirationDate = () => {
    const now = new Date();
    switch (expirationOption) {
      case "24h": now.setHours(now.getHours() + 24); return now;
      case "3d": now.setDate(now.getDate() + 3); return now;
      case "7d": now.setDate(now.getDate() + 7); return now;
      case "15d": now.setDate(now.getDate() + 15); return now;
      case "1m": now.setMonth(now.getMonth() + 1); return now;
      case "manual": return manualExpirationDate ? new Date(manualExpirationDate) : null;
      default: return null;
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);

    const jwt = session?.accessToken || session?.token ||
      (typeof window !== "undefined" && localStorage.getItem("userToken"));

    if (!jwt) {
      setSnackbar({ open: true, message: "No se encontro token. Inicia sesion de nuevo.", severity: "error" });
      setSubmitting(false);
      return;
    }

    const expirationDate = computeExpirationDate();

    try {
      // 1. Create the job
      const res = await fetch(`${API_BASE}/api/job/create`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${jwt}` },
        body: JSON.stringify({
          title, description, requirements,
          userId: Number(session.user.id),
          expirationDate: expirationDate ? expirationDate.toISOString() : null,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        setSnackbar({ open: true, message: data.detail || "Error al publicar", severity: "error" });
        setSubmitting(false);
        return;
      }

      const jobData = await res.json();
      const jobId = jobData.job_id || jobData.id;

      // 2. If featured, create payment preference and redirect
      if (planType === "featured" && jobId) {
        const payRes = await fetch(`${API_BASE}/api/payments/create-preference`, {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${jwt}` },
          body: JSON.stringify({ job_id: jobId, title }),
        });

        if (payRes.ok) {
          const payData = await payRes.json();
          window.location.href = payData.checkout_url;
          return;
        } else {
          setSnackbar({
            open: true,
            message: "Oferta creada pero hubo un error con el pago. Podes intentar pagar desde Mis Ofertas.",
            severity: "warning",
          });
        }
      } else {
        setSnackbar({ open: true, message: "Oferta publicada exitosamente", severity: "success" });
        setTimeout(() => router.push("/job-list"), 2000);
      }
    } catch (err) {
      setSnackbar({ open: true, message: "Error de red. Intenta nuevamente.", severity: "error" });
    } finally {
      setSubmitting(false);
    }
  };

  if (status === "loading" || !session) {
    return <Typography align="center" sx={{ mt: 4 }}>Cargando...</Typography>;
  }

  return (
    <Container maxWidth="sm" sx={{ mt: 4, mb: 4 }}>
      <Typography variant="h4" gutterBottom sx={{ fontWeight: 600 }}>
        Publicar Oferta
      </Typography>

      <Box component="form" onSubmit={handleSubmit} sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
        <TextField label="Titulo del puesto" value={title} onChange={(e) => setTitle(e.target.value)} required fullWidth />
        <TextField label="Descripcion" value={description} onChange={(e) => setDescription(e.target.value)} required multiline rows={4} fullWidth />
        <TextField label="Requisitos" value={requirements} onChange={(e) => setRequirements(e.target.value)} multiline rows={3} fullWidth />

        <FormControl fullWidth>
          <InputLabel>Expiracion</InputLabel>
          <Select value={expirationOption} label="Expiracion" onChange={(e) => setExpirationOption(e.target.value)}>
            <MenuItem value="24h">24 horas</MenuItem>
            <MenuItem value="3d">3 dias</MenuItem>
            <MenuItem value="7d">7 dias</MenuItem>
            <MenuItem value="15d">15 dias</MenuItem>
            <MenuItem value="1m">1 mes</MenuItem>
            <MenuItem value="manual">Fecha manual</MenuItem>
          </Select>
        </FormControl>

        {expirationOption === "manual" && (
          <TextField type="date" label="Fecha" value={manualExpirationDate}
            onChange={(e) => setManualExpirationDate(e.target.value)} InputLabelProps={{ shrink: true }} fullWidth />
        )}

        {/* Plan selection */}
        <Divider sx={{ my: 1 }} />
        <Typography variant="h6" sx={{ fontWeight: 600 }}>Tipo de publicacion</Typography>

        <RadioGroup value={planType} onChange={(e) => setPlanType(e.target.value)}>
          <Card variant="outlined" sx={{ mb: 1.5, borderColor: planType === "free" ? "primary.main" : "divider" }}>
            <CardContent sx={{ display: "flex", alignItems: "center", gap: 2, py: 1.5, "&:last-child": { pb: 1.5 } }}>
              <FormControlLabel value="free" control={<Radio />} label="" sx={{ m: 0 }} />
              <WorkIcon color="action" />
              <Box>
                <Typography fontWeight={600}>Publicacion Gratuita</Typography>
                <Typography variant="body2" color="text.secondary">
                  Tu oferta aparece en el listado general. Los candidatos la ven y se postulan.
                </Typography>
              </Box>
              <Chip label="Gratis" size="small" sx={{ ml: "auto" }} />
            </CardContent>
          </Card>

          <Card variant="outlined" sx={{ borderColor: planType === "featured" ? "primary.main" : "divider", borderWidth: planType === "featured" ? 2 : 1 }}>
            <CardContent sx={{ display: "flex", alignItems: "center", gap: 2, py: 1.5, "&:last-child": { pb: 1.5 } }}>
              <FormControlLabel value="featured" control={<Radio />} label="" sx={{ m: 0 }} />
              <StarIcon sx={{ color: "#FFB300" }} />
              <Box>
                <Typography fontWeight={600}>Publicacion Destacada</Typography>
                <Typography variant="body2" color="text.secondary">
                  Aparece primero en el listado + se envia por email a todos los candidatos del rubro que matchean.
                </Typography>
              </Box>
              <Chip label="$15.000" color="primary" size="small" sx={{ ml: "auto" }} />
            </CardContent>
          </Card>
        </RadioGroup>

        <Box sx={{ display: "flex", justifyContent: "space-between", mt: 2 }}>
          <Button type="submit" variant="contained" size="large" disabled={submitting}>
            {submitting ? "Publicando..." : planType === "featured" ? "Publicar y Pagar" : "Publicar Oferta"}
          </Button>
          <Button variant="outlined" onClick={() => router.push("/dashboard")}>
            Cancelar
          </Button>
        </Box>
      </Box>

      <Snackbar open={snackbar.open} autoHideDuration={4000}
        onClose={() => setSnackbar((s) => ({ ...s, open: false }))}
        anchorOrigin={{ vertical: "bottom", horizontal: "center" }}>
        <Alert severity={snackbar.severity} variant="filled" sx={{ width: "100%" }}
          onClose={() => setSnackbar((s) => ({ ...s, open: false }))}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Container>
  );
}
