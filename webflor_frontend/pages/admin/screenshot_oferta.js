import { useState } from "react";
import {
  Box, Typography, Button, Paper, TextField, Grid, Alert,
  CircularProgress, Chip, Card, CardContent, CardActions,
  Select, MenuItem, FormControl, InputLabel,
} from "@mui/material";
import CloudUploadIcon from "@mui/icons-material/CloudUpload";
import PublishIcon from "@mui/icons-material/Publish";
import ImageIcon from "@mui/icons-material/Image";
import DashboardLayout from "../../components/DashboardLayout";
import useAdminAuth from "../../hooks/useAdminAuth";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "https://api.fapmendoza.online";

export default function ScreenshotOfertaPage() {
  useAdminAuth();
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [extracting, setExtracting] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [jobData, setJobData] = useState(null);
  const [result, setResult] = useState(null);

  const token = typeof window !== "undefined" ? localStorage.getItem("adminToken") : null;

  const handleFileChange = (e) => {
    const f = e.target.files[0];
    if (f) {
      setFile(f);
      setPreview(URL.createObjectURL(f));
      setJobData(null);
      setResult(null);
    }
  };

  const handleExtract = async () => {
    if (!file) return;
    setExtracting(true);
    setResult(null);

    const formData = new FormData();
    formData.append("file", file);

    try {
      const res = await fetch(`${API_URL}/api/screenshot-job/extract`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });
      const data = await res.json();

      if (data.success) {
        setJobData(data.job);
      } else {
        setResult({ severity: "warning", text: data.error || "No se pudo extraer la oferta" });
      }
    } catch (e) {
      setResult({ severity: "error", text: "Error de conexion" });
    } finally {
      setExtracting(false);
    }
  };

  const handlePublish = async () => {
    if (!jobData) return;
    setPublishing(true);
    setResult(null);

    try {
      const res = await fetch(`${API_URL}/api/job/create-admin`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          title: jobData.title,
          description: jobData.description,
          requirements: jobData.requirements,
          rubro: jobData.rubro,
          contactEmail: jobData.contactEmail || "",
          contactPhone: jobData.contactPhone || "",
          label: "automatic",
        }),
      });

      if (res.ok) {
        setResult({ severity: "success", text: "Oferta publicada exitosamente!" });
        setJobData(null);
        setFile(null);
        setPreview(null);
      } else {
        const err = await res.json();
        setResult({ severity: "error", text: err.detail || "Error al publicar" });
      }
    } catch (e) {
      setResult({ severity: "error", text: "Error de conexion" });
    } finally {
      setPublishing(false);
    }
  };

  const updateField = (field, value) => {
    setJobData((prev) => ({ ...prev, [field]: value }));
  };

  return (
    <DashboardLayout>
      <Box sx={{ p: 3, maxWidth: 900, mx: "auto" }}>
        <Typography variant="h4" sx={{ mb: 1, fontWeight: 600 }}>
          Screenshot a Oferta
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
          Subi un screenshot de una oferta de trabajo (de redes sociales, WhatsApp, etc.) y la IA
          extraera los datos para publicarla en la plataforma.
        </Typography>

        {/* Upload section */}
        <Paper sx={{ p: 3, mb: 3, borderRadius: 2, textAlign: "center" }}>
          <input
            type="file" accept="image/*" id="screenshot-input"
            style={{ display: "none" }} onChange={handleFileChange}
          />
          <label htmlFor="screenshot-input">
            <Button variant="outlined" component="span" startIcon={<CloudUploadIcon />} size="large">
              Seleccionar imagen
            </Button>
          </label>

          {preview && (
            <Box sx={{ mt: 2 }}>
              <img
                src={preview} alt="Preview"
                style={{ maxWidth: "100%", maxHeight: 300, borderRadius: 8, border: "1px solid #ddd" }}
              />
              <Box sx={{ mt: 2 }}>
                <Button
                  variant="contained" startIcon={extracting ? <CircularProgress size={20} color="inherit" /> : <ImageIcon />}
                  onClick={handleExtract} disabled={extracting}
                >
                  {extracting ? "Extrayendo..." : "Extraer datos con IA"}
                </Button>
              </Box>
            </Box>
          )}
        </Paper>

        {/* Extracted data - editable */}
        {jobData && (
          <Card sx={{ mb: 3, borderRadius: 2 }}>
            <CardContent>
              <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 2 }}>
                <Typography variant="h6">Datos extraidos</Typography>
                <Chip label={jobData.rubro} color="primary" size="small" />
              </Box>

              <Grid container spacing={2}>
                <Grid item xs={12}>
                  <TextField
                    fullWidth label="Titulo" value={jobData.title || ""}
                    onChange={(e) => updateField("title", e.target.value)}
                  />
                </Grid>
                <Grid item xs={12}>
                  <TextField
                    fullWidth multiline rows={4} label="Descripcion" value={jobData.description || ""}
                    onChange={(e) => updateField("description", e.target.value)}
                  />
                </Grid>
                <Grid item xs={12}>
                  <TextField
                    fullWidth multiline rows={2} label="Requisitos" value={jobData.requirements || ""}
                    onChange={(e) => updateField("requirements", e.target.value)}
                  />
                </Grid>
                <Grid item xs={12} sm={4}>
                  <FormControl fullWidth size="small">
                    <InputLabel>Rubro</InputLabel>
                    <Select value={jobData.rubro || "General"} label="Rubro" onChange={(e) => updateField("rubro", e.target.value)}>
                      {["Gastronomia","Seguridad","Comercio/Ventas","Administracion","IT/Sistemas","Construccion","Salud","Educacion","Logistica/Transporte","Produccion/Industria","Servicios Generales","Diseno/Comunicacion","Turismo/Hoteleria","Agricultura","General"].map(r => (
                        <MenuItem key={r} value={r}>{r}</MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Grid>
                <Grid item xs={12} sm={4}>
                  <TextField
                    fullWidth size="small" label="Email contacto" value={jobData.contactEmail || ""}
                    onChange={(e) => updateField("contactEmail", e.target.value)}
                  />
                </Grid>
                <Grid item xs={12} sm={4}>
                  <TextField
                    fullWidth size="small" label="Telefono contacto" value={jobData.contactPhone || ""}
                    onChange={(e) => updateField("contactPhone", e.target.value)}
                  />
                </Grid>
                {jobData.location && (
                  <Grid item xs={12} sm={6}>
                    <TextField fullWidth size="small" label="Ubicacion" value={jobData.location} disabled />
                  </Grid>
                )}
                {jobData.salary && (
                  <Grid item xs={12} sm={6}>
                    <TextField fullWidth size="small" label="Sueldo" value={jobData.salary} disabled />
                  </Grid>
                )}
              </Grid>
            </CardContent>
            <CardActions sx={{ justifyContent: "flex-end", p: 2 }}>
              <Button
                variant="contained" color="primary" size="large"
                startIcon={publishing ? <CircularProgress size={20} color="inherit" /> : <PublishIcon />}
                onClick={handlePublish} disabled={publishing || !jobData.title}
              >
                {publishing ? "Publicando..." : "Publicar oferta"}
              </Button>
            </CardActions>
          </Card>
        )}

        {result && (
          <Alert severity={result.severity} sx={{ mt: 2 }}>
            {result.text}
          </Alert>
        )}
      </Box>
    </DashboardLayout>
  );
}
