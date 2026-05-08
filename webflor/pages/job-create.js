import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/router";
import { useSession } from "next-auth/react";
import {
  Box, Container, Typography, TextField, Button, Snackbar, Alert,
  Select, MenuItem, InputLabel, FormControl, Paper, Chip, Divider,
  Card, CardContent, CardActions, Radio, RadioGroup, FormControlLabel,
  Checkbox, IconButton, Accordion, AccordionSummary, AccordionDetails,
} from "@mui/material";
import StarIcon from "@mui/icons-material/Star";
import WorkIcon from "@mui/icons-material/Work";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import CloudUploadIcon from "@mui/icons-material/CloudUpload";
import CloseIcon from "@mui/icons-material/Close";
import DashboardLayout from "../components/DashboardLayout";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "";

const CONTRACT_TYPES = [
  { value: "ocasional", label: "Ocasional", desc: "Trabajo puntual, horas o pocos dias" },
  { value: "temporal", label: "Temporal", desc: "Semanas o meses, con fecha de fin" },
  { value: "contrato", label: "Contrato", desc: "Plazo determinado con contrato formal" },
  { value: "efectivo", label: "Efectivo", desc: "Puesto permanente" },
  { value: "freelance", label: "Freelance", desc: "Por proyecto, sin relacion de dependencia" },
];

const MODALITY_OPTIONS = [
  { value: "presencial", label: "Presencial" },
  { value: "remoto", label: "Remoto" },
  { value: "hibrido", label: "Hibrido" },
];

export default function JobCreate({ toggleDarkMode, currentMode }) {
  const router = useRouter();
  const { data: session, status } = useSession();

  // Section 1 — Datos basicos
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [requirements, setRequirements] = useState("");

  // Section 2 — Detalles del puesto
  const [contractType, setContractType] = useState("efectivo");
  const [modality, setModality] = useState("presencial");
  const [location, setLocation] = useState("");
  const [salaryMin, setSalaryMin] = useState("");
  const [salaryMax, setSalaryMax] = useState("");
  const [salaryVisible, setSalaryVisible] = useState(true);

  // Section 3 — Presentacion
  const [bannerFile, setBannerFile] = useState(null);
  const [bannerPreview, setBannerPreview] = useState(null);
  const [benefitInput, setBenefitInput] = useState("");
  const [benefits, setBenefits] = useState([]);
  const [tags, setTags] = useState([]);
  const [tagInput, setTagInput] = useState("");
  const [tagsLoading, setTagsLoading] = useState(false);

  // Section 4 — Publicacion
  const [expirationOption, setExpirationOption] = useState("7d");
  const [manualExpirationDate, setManualExpirationDate] = useState("");
  const [planType, setPlanType] = useState("free");

  const [submitting, setSubmitting] = useState(false);
  const [snackbar, setSnackbar] = useState({ open: false, message: "", severity: "success" });

  useEffect(() => {
    if (status !== "loading" && !session) router.push("/login");
    else if (session && !session.user.role) router.push("/select-role");
  }, [session, status, router]);

  // Auto-generate tags when title+description are filled
  const generateTags = useCallback(async () => {
    if (!title.trim() || !description.trim()) return;
    setTagsLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/job/generate-tags`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, description }),
      });
      if (res.ok) {
        const data = await res.json();
        setTags(data.tags || []);
      }
    } catch {
      // silent fail
    } finally {
      setTagsLoading(false);
    }
  }, [title, description]);

  // Trigger tag generation on blur of description field
  const handleDescriptionBlur = () => {
    if (tags.length === 0 && title.trim() && description.trim()) {
      generateTags();
    }
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
    if (val && !benefits.includes(val)) {
      setBenefits([...benefits, val]);
    }
    setBenefitInput("");
  };

  const addTag = () => {
    const val = tagInput.trim().toLowerCase().replace(/\s+/g, "-").replace(/^#/, "");
    if (val && !tags.includes(val)) {
      setTags([...tags, val]);
    }
    setTagInput("");
  };

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

    const jwt = session?.accessToken || session?.user?.token ||
      (typeof window !== "undefined" && localStorage.getItem("userToken"));

    if (!jwt) {
      setSnackbar({ open: true, message: "No se encontro token. Inicia sesion de nuevo.", severity: "error" });
      setSubmitting(false);
      return;
    }

    const expirationDate = computeExpirationDate();

    try {
      // 1. Upload banner if selected
      let banner_url = null;
      if (bannerFile) {
        const formData = new FormData();
        formData.append("file", bannerFile);
        const bannerRes = await fetch(`${API_BASE}/api/job/upload-banner`, {
          method: "POST",
          headers: { Authorization: `Bearer ${jwt}` },
          body: formData,
        });
        if (bannerRes.ok) {
          const bannerData = await bannerRes.json();
          banner_url = bannerData.banner_url;
        }
      }

      // 2. Create the job
      const res = await fetch(`${API_BASE}/api/job/create`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${jwt}` },
        body: JSON.stringify({
          title, description, requirements,
          userId: Number(session.user.id),
          expirationDate: expirationDate ? expirationDate.toISOString() : null,
          contract_type: contractType,
          modality,
          location: location || null,
          salary_min: salaryMin ? Number(salaryMin) : null,
          salary_max: salaryMax ? Number(salaryMax) : null,
          salary_visible: salaryVisible,
          benefits: benefits.length > 0 ? benefits : null,
          tags: tags.length > 0 ? tags : null,
          banner_url,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        setSnackbar({ open: true, message: data.detail || "Error al publicar", severity: "error" });
        setSubmitting(false);
        return;
      }

      const jobData = await res.json();
      const jobId = jobData.jobId || jobData.job_id || jobData.id;

      // 3. If featured, create payment preference and redirect
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
    <DashboardLayout toggleDarkMode={toggleDarkMode} currentMode={currentMode}>
    <Container maxWidth="sm" sx={{ mt: 4, mb: 4 }}>
      <Typography variant="h4" gutterBottom sx={{ fontWeight: 600 }}>
        Publicar Oferta
      </Typography>

      <Box component="form" onSubmit={handleSubmit} sx={{ display: "flex", flexDirection: "column", gap: 2 }}>

        {/* ── Section 1: Datos basicos ── */}
        <Accordion defaultExpanded>
          <AccordionSummary expandIcon={<ExpandMoreIcon />}>
            <Typography fontWeight={600}>Datos basicos</Typography>
          </AccordionSummary>
          <AccordionDetails sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
            <TextField label="Titulo del puesto" value={title} onChange={(e) => setTitle(e.target.value)} required fullWidth />
            <TextField
              label="Descripcion"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              onBlur={handleDescriptionBlur}
              required multiline rows={4} fullWidth
            />
            <TextField label="Requisitos" value={requirements} onChange={(e) => setRequirements(e.target.value)} multiline rows={3} fullWidth />
          </AccordionDetails>
        </Accordion>

        {/* ── Section 2: Detalles del puesto ── */}
        <Accordion defaultExpanded>
          <AccordionSummary expandIcon={<ExpandMoreIcon />}>
            <Typography fontWeight={600}>Detalles del puesto</Typography>
          </AccordionSummary>
          <AccordionDetails sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
            <FormControl fullWidth>
              <InputLabel>Tipo de contratacion</InputLabel>
              <Select value={contractType} label="Tipo de contratacion" onChange={(e) => setContractType(e.target.value)}>
                {CONTRACT_TYPES.map((ct) => (
                  <MenuItem key={ct.value} value={ct.value}>
                    <Box>
                      <Typography variant="body2" fontWeight={500}>{ct.label}</Typography>
                      <Typography variant="caption" color="text.secondary">{ct.desc}</Typography>
                    </Box>
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            <FormControl fullWidth>
              <InputLabel>Modalidad</InputLabel>
              <Select value={modality} label="Modalidad" onChange={(e) => setModality(e.target.value)}>
                {MODALITY_OPTIONS.map((m) => (
                  <MenuItem key={m.value} value={m.value}>{m.label}</MenuItem>
                ))}
              </Select>
            </FormControl>

            <TextField
              label="Ubicacion"
              placeholder="Ej: Godoy Cruz, Mendoza"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              fullWidth
            />

            <Box sx={{ display: "flex", gap: 2 }}>
              <TextField
                label="Sueldo minimo"
                type="number"
                value={salaryMin}
                onChange={(e) => setSalaryMin(e.target.value)}
                fullWidth
              />
              <TextField
                label="Sueldo maximo"
                type="number"
                value={salaryMax}
                onChange={(e) => setSalaryMax(e.target.value)}
                fullWidth
              />
            </Box>

            <FormControlLabel
              control={<Checkbox checked={!salaryVisible} onChange={(e) => setSalaryVisible(!e.target.checked)} />}
              label="No mostrar sueldo (se muestra 'A convenir')"
            />
          </AccordionDetails>
        </Accordion>

        {/* ── Section 3: Presentacion ── */}
        <Accordion>
          <AccordionSummary expandIcon={<ExpandMoreIcon />}>
            <Typography fontWeight={600}>Presentacion (opcional)</Typography>
          </AccordionSummary>
          <AccordionDetails sx={{ display: "flex", flexDirection: "column", gap: 2 }}>

            {/* Banner upload */}
            <Box>
              <Typography variant="body2" gutterBottom>Imagen/Banner</Typography>
              {bannerPreview ? (
                <Box sx={{ position: "relative", mb: 1 }}>
                  <Box
                    component="img"
                    src={bannerPreview}
                    alt="Banner"
                    sx={{ width: "100%", maxHeight: 180, objectFit: "cover", borderRadius: 1 }}
                  />
                  <IconButton
                    size="small"
                    onClick={removeBanner}
                    sx={{ position: "absolute", top: 4, right: 4, bgcolor: "rgba(0,0,0,0.5)", color: "#fff" }}
                  >
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

            {/* Benefits chips */}
            <Box>
              <Typography variant="body2" gutterBottom>Beneficios</Typography>
              <Box sx={{ display: "flex", gap: 1 }}>
                <TextField
                  size="small"
                  placeholder="Ej: Comida incluida"
                  value={benefitInput}
                  onChange={(e) => setBenefitInput(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addBenefit(); } }}
                  fullWidth
                />
                <Button variant="outlined" onClick={addBenefit} disabled={!benefitInput.trim()}>
                  Agregar
                </Button>
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
                  <Button size="small" variant="text" onClick={generateTags} disabled={tagsLoading || !title.trim() || !description.trim()}>
                    {tagsLoading ? "Generando..." : "Generar automaticamente"}
                  </Button>
                )}
              </Box>
              <Box sx={{ display: "flex", gap: 1, mt: 0.5 }}>
                <TextField
                  size="small"
                  placeholder="Agregar tag..."
                  value={tagInput}
                  onChange={(e) => setTagInput(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addTag(); } }}
                  fullWidth
                />
                <Button variant="outlined" onClick={addTag} disabled={!tagInput.trim()}>
                  Agregar
                </Button>
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

        {/* ── Section 4: Publicacion ── */}
        <Accordion defaultExpanded>
          <AccordionSummary expandIcon={<ExpandMoreIcon />}>
            <Typography fontWeight={600}>Publicacion</Typography>
          </AccordionSummary>
          <AccordionDetails sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
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

            <Divider />
            <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>Tipo de publicacion</Typography>

            <RadioGroup value={planType} onChange={(e) => setPlanType(e.target.value)}>
              <Card variant="outlined" sx={{ mb: 1.5, borderColor: planType === "free" ? "primary.main" : "divider" }}>
                <CardContent sx={{ display: "flex", alignItems: "center", gap: 2, py: 1.5, "&:last-child": { pb: 1.5 } }}>
                  <FormControlLabel value="free" control={<Radio />} label="" sx={{ m: 0 }} />
                  <WorkIcon color="action" />
                  <Box>
                    <Typography fontWeight={600}>Publicacion Gratuita</Typography>
                    <Typography variant="body2" color="text.secondary">
                      Tu oferta aparece en el listado general.
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
                      Aparece primero + se envia por email a candidatos del rubro.
                    </Typography>
                  </Box>
                  <Chip label="$15.000" color="primary" size="small" sx={{ ml: "auto" }} />
                </CardContent>
              </Card>
            </RadioGroup>
          </AccordionDetails>
        </Accordion>

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
    </DashboardLayout>
  );
}
