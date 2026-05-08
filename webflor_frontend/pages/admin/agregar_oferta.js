import React, { useState, useEffect, useCallback } from "react";
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
  CircularProgress,
  Chip,
  Divider,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  IconButton,
} from "@mui/material";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import CloudUploadIcon from "@mui/icons-material/CloudUpload";
import CloseIcon from "@mui/icons-material/Close";
import DashboardLayout from "../../components/DashboardLayout";
import useAdminAuth from "../../hooks/useAdminAuth";

const API_URL = process.env.NEXT_PUBLIC_API_URL;

const CONTRACT_TYPES = [
  { value: "ocasional", label: "Ocasional" },
  { value: "temporal", label: "Temporal" },
  { value: "contrato", label: "Contrato" },
  { value: "efectivo", label: "Efectivo" },
  { value: "freelance", label: "Freelance" },
];

const MODALITY_OPTIONS = [
  { value: "presencial", label: "Presencial" },
  { value: "remoto", label: "Remoto" },
  { value: "hibrido", label: "Hibrido" },
];

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
    contactPhone: "",
    // Enhanced fields
    contract_type: "efectivo",
    modality: "presencial",
    location: "",
    salary_min: "",
    salary_max: "",
    salary_visible: true,
  });

  const [bannerFile, setBannerFile] = useState(null);
  const [bannerPreview, setBannerPreview] = useState(null);
  const [benefitInput, setBenefitInput] = useState("");
  const [benefits, setBenefits] = useState([]);
  const [tags, setTags] = useState([]);
  const [tagInput, setTagInput] = useState("");
  const [tagsLoading, setTagsLoading] = useState(false);

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

  const handleBannerSelect = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setBannerFile(file);
    setBannerPreview(URL.createObjectURL(file));
  };

  const removeBanner = () => {
    setBannerFile(null);
    setBannerPreview(null);
  };

  const addBenefit = () => {
    const val = benefitInput.trim();
    if (val && !benefits.includes(val)) setBenefits([...benefits, val]);
    setBenefitInput("");
  };

  const addTag = () => {
    const val = tagInput.trim().toLowerCase().replace(/\s+/g, "-").replace(/^#/, "");
    if (val && !tags.includes(val)) setTags([...tags, val]);
    setTagInput("");
  };

  const generateTags = async () => {
    if (!form.title.trim() || !form.description.trim()) return;
    setTagsLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/job/generate-tags`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: form.title, description: form.description }),
      });
      if (res.ok) {
        const data = await res.json();
        setTags(data.tags || []);
      }
    } catch { /* silent */ }
    finally { setTagsLoading(false); }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!adminId) return;
    setSubmitting(true);

    const token = localStorage.getItem("adminToken");
    const expiration = computeExpiration();

    try {
      // Upload banner if selected
      let banner_url = null;
      if (bannerFile) {
        const fd = new FormData();
        fd.append("file", bannerFile);
        const bannerRes = await fetch(`${API_URL}/api/job/upload-banner`, {
          method: "POST",
          headers: { Authorization: `Bearer ${token}` },
          body: fd,
        });
        if (bannerRes.ok) {
          const bd = await bannerRes.json();
          banner_url = bd.banner_url;
        }
      }

      const payload = {
        title: form.title,
        description: form.description,
        requirements: form.requirements,
        expirationDate: expiration ? expiration.toISOString() : null,
        userId: adminId,
        label: form.label,
        source: form.source,
        isPaid: form.isPaid,
        contactEmail: form.contactEmail || undefined,
        contactPhone: form.contactPhone || undefined,
        contract_type: form.contract_type,
        modality: form.modality,
        location: form.location || null,
        salary_min: form.salary_min ? Number(form.salary_min) : null,
        salary_max: form.salary_max ? Number(form.salary_max) : null,
        salary_visible: form.salary_visible,
        benefits: benefits.length > 0 ? benefits : null,
        tags: tags.length > 0 ? tags : null,
        banner_url,
      };

      const res = await fetch(`${API_URL}/api/job/create-admin`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });
      if (res.ok) {
        setSnackbar({ open: true, message: "Oferta publicada con exito", severity: "success" });
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
      <Container maxWidth="sm" sx={{ mt: 4, mb: 4 }}>
        <Typography variant="h4" gutterBottom align="center">Publicar Oferta</Typography>
        <Box component="form" onSubmit={handleSubmit} sx={{ display: "flex", flexDirection: "column", gap: 2 }}>

          {/* Section 1: Datos basicos */}
          <Accordion defaultExpanded>
            <AccordionSummary expandIcon={<ExpandMoreIcon />}>
              <Typography fontWeight={600}>Datos basicos</Typography>
            </AccordionSummary>
            <AccordionDetails sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
              <TextField label="Titulo" value={form.title} onChange={handleChange("title")} required fullWidth />
              <TextField label="Descripcion" value={form.description} onChange={handleChange("description")} required multiline rows={4} fullWidth />
              <TextField label="Requisitos" value={form.requirements} onChange={handleChange("requirements")} required multiline rows={3} fullWidth />
            </AccordionDetails>
          </Accordion>

          {/* Section 2: Detalles del puesto */}
          <Accordion defaultExpanded>
            <AccordionSummary expandIcon={<ExpandMoreIcon />}>
              <Typography fontWeight={600}>Detalles del puesto</Typography>
            </AccordionSummary>
            <AccordionDetails sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
              <FormControl fullWidth>
                <InputLabel>Tipo de contratacion</InputLabel>
                <Select value={form.contract_type} label="Tipo de contratacion" onChange={handleChange("contract_type")}>
                  {CONTRACT_TYPES.map((ct) => (
                    <MenuItem key={ct.value} value={ct.value}>{ct.label}</MenuItem>
                  ))}
                </Select>
              </FormControl>

              <FormControl fullWidth>
                <InputLabel>Modalidad</InputLabel>
                <Select value={form.modality} label="Modalidad" onChange={handleChange("modality")}>
                  {MODALITY_OPTIONS.map((m) => (
                    <MenuItem key={m.value} value={m.value}>{m.label}</MenuItem>
                  ))}
                </Select>
              </FormControl>

              <TextField label="Ubicacion" placeholder="Ej: Godoy Cruz, Mendoza" value={form.location} onChange={handleChange("location")} fullWidth />

              <Box sx={{ display: "flex", gap: 2 }}>
                <TextField label="Sueldo minimo" type="number" value={form.salary_min} onChange={handleChange("salary_min")} fullWidth />
                <TextField label="Sueldo maximo" type="number" value={form.salary_max} onChange={handleChange("salary_max")} fullWidth />
              </Box>

              <FormControlLabel
                control={<Checkbox checked={!form.salary_visible} onChange={(e) => setForm(prev => ({ ...prev, salary_visible: !e.target.checked }))} />}
                label="No mostrar sueldo (se muestra 'A convenir')"
              />
            </AccordionDetails>
          </Accordion>

          {/* Section 3: Presentacion */}
          <Accordion>
            <AccordionSummary expandIcon={<ExpandMoreIcon />}>
              <Typography fontWeight={600}>Presentacion (opcional)</Typography>
            </AccordionSummary>
            <AccordionDetails sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
              {/* Banner */}
              <Box>
                <Typography variant="body2" gutterBottom>Imagen/Banner</Typography>
                {bannerPreview ? (
                  <Box sx={{ position: "relative", mb: 1 }}>
                    <Box component="img" src={bannerPreview} alt="Banner" sx={{ width: "100%", maxHeight: 180, objectFit: "cover", borderRadius: 1 }} />
                    <IconButton size="small" onClick={removeBanner} sx={{ position: "absolute", top: 4, right: 4, bgcolor: "rgba(0,0,0,0.5)", color: "#fff" }}>
                      <CloseIcon fontSize="small" />
                    </IconButton>
                  </Box>
                ) : (
                  <Button variant="outlined" component="label" startIcon={<CloudUploadIcon />}>
                    Subir imagen
                    <input type="file" hidden accept="image/*" onChange={handleBannerSelect} />
                  </Button>
                )}
              </Box>

              {/* Benefits */}
              <Box>
                <Typography variant="body2" gutterBottom>Beneficios</Typography>
                <Box sx={{ display: "flex", gap: 1 }}>
                  <TextField size="small" placeholder="Ej: Comida incluida" value={benefitInput}
                    onChange={(e) => setBenefitInput(e.target.value)}
                    onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addBenefit(); } }}
                    fullWidth />
                  <Button variant="outlined" onClick={addBenefit} disabled={!benefitInput.trim()}>Agregar</Button>
                </Box>
                {benefits.length > 0 && (
                  <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.5, mt: 1 }}>
                    {benefits.map((b, i) => (
                      <Chip key={i} label={b} size="small" onDelete={() => setBenefits(benefits.filter((_, j) => j !== i))} />
                    ))}
                  </Box>
                )}
              </Box>

              {/* Tags */}
              <Box>
                <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                  <Typography variant="body2">Tags</Typography>
                  {tags.length === 0 && (
                    <Button size="small" variant="text" onClick={generateTags} disabled={tagsLoading || !form.title.trim() || !form.description.trim()}>
                      {tagsLoading ? "Generando..." : "Generar automaticamente"}
                    </Button>
                  )}
                </Box>
                <Box sx={{ display: "flex", gap: 1, mt: 0.5 }}>
                  <TextField size="small" placeholder="Agregar tag..." value={tagInput}
                    onChange={(e) => setTagInput(e.target.value)}
                    onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addTag(); } }}
                    fullWidth />
                  <Button variant="outlined" onClick={addTag} disabled={!tagInput.trim()}>Agregar</Button>
                </Box>
                {tags.length > 0 && (
                  <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.5, mt: 1 }}>
                    {tags.map((t, i) => (
                      <Chip key={i} label={`#${t}`} size="small" color="info" variant="outlined"
                        onDelete={() => setTags(tags.filter((_, j) => j !== i))} />
                    ))}
                  </Box>
                )}
              </Box>
            </AccordionDetails>
          </Accordion>

          {/* Section 4: Configuracion admin */}
          <Accordion defaultExpanded>
            <AccordionSummary expandIcon={<ExpandMoreIcon />}>
              <Typography fontWeight={600}>Configuracion</Typography>
            </AccordionSummary>
            <AccordionDetails sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
              <FormControl fullWidth>
                <InputLabel id="exp-label">Expiracion</InputLabel>
                <Select labelId="exp-label" value={form.expirationOption} label="Expiracion" onChange={handleChange("expirationOption")}>
                  <MenuItem value="24h">24 horas</MenuItem>
                  <MenuItem value="3d">3 dias</MenuItem>
                  <MenuItem value="7d">7 dias</MenuItem>
                  <MenuItem value="15d">15 dias</MenuItem>
                  <MenuItem value="1m">1 mes</MenuItem>
                  <MenuItem value="manual">Fecha manual</MenuItem>
                </Select>
              </FormControl>
              {form.expirationOption === "manual" && (
                <TextField label="Fecha de expiracion" type="date" value={form.manualDate} onChange={handleChange("manualDate")} InputLabelProps={{ shrink: true }} fullWidth />
              )}

              <FormControl fullWidth>
                <InputLabel id="label-label">Etiqueta</InputLabel>
                <Select labelId="label-label" value={form.label} label="Etiqueta" onChange={handleChange("label")}>
                  <MenuItem value="automatic">Automatico</MenuItem>
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
              <TextField label="Telefono de contacto" value={form.contactPhone} onChange={handleChange("contactPhone")} fullWidth />

              <FormControlLabel
                control={<Checkbox checked={form.isPaid} onChange={handleChange("isPaid")} />}
                label="Oferta pagada"
              />
            </AccordionDetails>
          </Accordion>

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
