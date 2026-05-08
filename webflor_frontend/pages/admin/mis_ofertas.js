// pages/admin/mis_ofertas.js

import React, { useEffect, useMemo, useState, useRef } from "react";
import {
  Container,
  Typography,
  Box,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  TextField,
  Snackbar,
  Alert,
  CircularProgress,
  Chip,
  Grid,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  FormControlLabel,
  Checkbox,
  IconButton,
} from "@mui/material";
import { alpha, useTheme } from "@mui/material/styles";
import StarIcon from "@mui/icons-material/Star";
import CloseIcon from "@mui/icons-material/Close";
import CloudUploadIcon from "@mui/icons-material/CloudUpload";
import { useRouter } from "next/router";
import DashboardLayout from "../../components/DashboardLayout";
import useAdminAuth from "../../hooks/useAdminAuth";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "https://api.fapmendoza.online";

const fmtDate  = (d) => (d ? new Date(d).toLocaleDateString("es-AR") : "Sin fecha");
const fmtLabel = (l) => (l === "manual" ? "Manual" : "Automatico");

const CONTRACT_LABELS = {
  ocasional: "Ocasional", temporal: "Temporal", contrato: "Contrato",
  efectivo: "Efectivo", freelance: "Freelance",
};
const MODALITY_LABELS = {
  presencial: "Presencial", remoto: "Remoto", hibrido: "Hibrido",
};

function fmtSalary(min, max, visible) {
  if (visible === false) return "A convenir";
  if (!min && !max) return "-";
  const fmt = (n) => Number(n).toLocaleString("es-AR", { maximumFractionDigits: 0 });
  if (min && max) return `$${fmt(min)} - $${fmt(max)}`;
  if (min) return `Desde $${fmt(min)}`;
  return `Hasta $${fmt(max)}`;
}

export default function MisOfertas({ toggleDarkMode, currentMode }) {
  const { user, loading } = useAdminAuth();
  const theme = useTheme();
  const [offers, setOffers] = useState([]);
  const [sel, setSel] = useState(null);
  const [busy, setBusy] = useState(false);
  const [snack, setSnack] = useState({ open: false, msg: "", sev: "success" });

  // Edit dialog extras
  const [editBenefitInput, setEditBenefitInput] = useState("");
  const [editTagInput, setEditTagInput] = useState("");
  const [editBannerFile, setEditBannerFile] = useState(null);
  const [editBannerPreview, setEditBannerPreview] = useState(null);

  // Delete confirmation dialog state
  const [deleteDialog, setDeleteDialog] = useState({ open: false, id: null, title: "" });

  const { query, replace } = useRouter();
  const highlightId = useRef(Number(query.jobId) || null);
  const tableContainerRef = useRef(null);

  // ── token / headers ──
  const token = typeof window !== "undefined" ? localStorage.getItem("adminToken") : null;
  const headers = useMemo(
    () => ({
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    }),
    [token]
  );

  // ── obtener ofertas ──
  const fetchOffers = () => {
    if (!user || !token) return;
    setBusy(true);
    fetch(`${API_URL}/api/job/admin/offers`, { headers })
      .then(async (r) => {
        if (!r.ok) {
          throw new Error(`HTTP ${r.status}`);
        }
        return r.json();
      })
      .then((json) => {
        setOffers(Array.isArray(json.offers) ? json.offers : []);
      })
      .catch(() => {
        setSnack({ open: true, msg: "Error obteniendo ofertas", sev: "error" });
      })
      .finally(() => setBusy(false));
  };

  useEffect(fetchOffers, [user, token]);

  // ── scroll y resaltar ──
  useEffect(() => {
    if (!busy && offers.length && highlightId.current && tableContainerRef.current) {
      const row = document.getElementById(`offer-row-${highlightId.current}`);
      if (row) row.scrollIntoView({ behavior: "smooth", block: "center" });
      replace("/admin/mis_ofertas", undefined, { shallow: true });
    }
  }, [busy, offers, replace]);

  // ── helpers ──
  const updateSel = (k, v) => setSel((old) => ({ ...old, [k]: v }));

  const openEdit = (o) => {
    const email = o.contactEmail ?? o.contact_email ?? "";
    const phone = o.contactPhone ?? o.contact_phone ?? "";
    setSel({
      ...o,
      contactEmail: email === "\u2014" ? "" : email,
      contactPhone: phone === "\u2014" ? "" : phone,
      benefits: o.benefits || [],
      tags: o.tags || [],
    });
    setEditBannerFile(null);
    setEditBannerPreview(o.banner_url || null);
    setEditBenefitInput("");
    setEditTagInput("");
  };

  const handleDelete = async (id) => {
    try {
      const res = await fetch(`${API_URL}/api/job/delete-admin`, {
        method: "DELETE",
        headers,
        body: JSON.stringify({ jobId: id }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      setOffers((prev) => prev.filter((o) => o.id !== id));
      setSnack({ open: true, msg: "Oferta eliminada", sev: "success" });
      if (highlightId.current === id) highlightId.current = null;
    } catch (_e) {
      setSnack({ open: true, msg: "Error eliminando oferta", sev: "error" });
    }
  };

  const handleSave = async () => {
    if (sel.source === "admin" && !sel.contactEmail) {
      setSnack({
        open: true,
        msg: "Las ofertas del administrador requieren e-mail de contacto",
        sev: "error",
      });
      return;
    }

    try {
      // Upload new banner if selected
      let banner_url = sel.banner_url || null;
      if (editBannerFile) {
        const fd = new FormData();
        fd.append("file", editBannerFile);
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

      const res = await fetch(`${API_URL}/api/job/update-admin`, {
        method: "PUT",
        headers,
        body: JSON.stringify({
          ...sel,
          banner_url,
        }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const upd = await res.json();
      setOffers((prev) => prev.map((o) => (o.id === upd.id ? upd : o)));
      setSnack({ open: true, msg: "Oferta actualizada", sev: "success" });
      setSel(null);
    } catch (_e) {
      setSnack({ open: true, msg: "Error actualizando oferta", sev: "error" });
    }
  };

  // ── loading ──
  if (loading || busy)
    return (
      <DashboardLayout toggleDarkMode={toggleDarkMode} currentMode={currentMode}>
        <Box sx={{ display: "flex", justifyContent: "center", mt: 8 }}>
          <CircularProgress />
        </Box>
      </DashboardLayout>
    );
  if (!user || !token) return null;

  // ── row background colors using theme ──
  const highlightBg = alpha(theme.palette.warning.light, 0.25);
  const ownRowBg = alpha(theme.palette.primary.main, 0.06);

  // ── UI ──
  return (
    <DashboardLayout toggleDarkMode={toggleDarkMode} currentMode={currentMode}>
      <Container sx={{ mt: 4 }}>
        <Typography variant="h4" gutterBottom>
          Mis ofertas de trabajo
        </Typography>

        <TableContainer component={Paper} ref={tableContainerRef}>
          <Table size="small">
            <TableHead>
              <TableRow>
                {[
                  "Titulo",
                  "Rubro",
                  "Contratacion",
                  "Modalidad",
                  "Ubicacion",
                  "Sueldo",
                  "Expira",
                  "Etiqueta",
                  "Fuente",
                  "Acciones",
                ].map((h) => (
                  <TableCell key={h}>{h}</TableCell>
                ))}
              </TableRow>
            </TableHead>
            <TableBody>
              {offers.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={10} align="center">
                    No hay ofertas
                  </TableCell>
                </TableRow>
              ) : (
                offers.map((o) => {
                  const isHighlight = o.id === highlightId.current;
                  const isPaid = o.is_paid || o.isPaid;
                  return (
                    <TableRow
                      key={o.id}
                      id={`offer-row-${o.id}`}
                      hover
                      sx={{
                        backgroundColor: isHighlight
                          ? highlightBg
                          : o.userId === user.id
                          ? ownRowBg
                          : "inherit",
                      }}
                    >
                      <TableCell>
                        <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                          {o.title}
                          {isPaid && (
                            <Chip
                              icon={<StarIcon />}
                              label="Destacada"
                              size="small"
                              color="warning"
                              variant="filled"
                            />
                          )}
                        </Box>
                      </TableCell>
                      <TableCell>
                        {o.rubro ? (
                          <Chip label={o.rubro} size="small" color="secondary" variant="outlined" />
                        ) : (
                          "\u2014"
                        )}
                      </TableCell>
                      <TableCell>
                        {CONTRACT_LABELS[o.contract_type] || o.contract_type || "\u2014"}
                      </TableCell>
                      <TableCell>
                        {MODALITY_LABELS[o.modality] || o.modality || "\u2014"}
                      </TableCell>
                      <TableCell>{o.location || "\u2014"}</TableCell>
                      <TableCell>{fmtSalary(o.salary_min, o.salary_max, o.salary_visible)}</TableCell>
                      <TableCell>{fmtDate(o.expirationDate)}</TableCell>
                      <TableCell>
                        <Chip label={fmtLabel(o.label)} size="small" />
                      </TableCell>
                      <TableCell>{o.source ?? "\u2014"}</TableCell>
                      <TableCell>
                        <Button
                          size="small"
                          variant="outlined"
                          sx={{ mr: 1 }}
                          onClick={() => openEdit(o)}
                        >
                          Editar
                        </Button>
                        <Button
                          size="small"
                          variant="outlined"
                          color="error"
                          onClick={() => setDeleteDialog({ open: true, id: o.id, title: o.title })}
                        >
                          Eliminar
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </Container>

      {/* Delete confirmation dialog */}
      <Dialog
        open={deleteDialog.open}
        onClose={() => setDeleteDialog({ open: false, id: null, title: "" })}
      >
        <DialogTitle>Confirmar eliminacion</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Estas seguro de que deseas eliminar la oferta <strong>{deleteDialog.title}</strong>? Esta accion no se puede deshacer.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialog({ open: false, id: null, title: "" })}>
            Cancelar
          </Button>
          <Button
            color="error"
            variant="contained"
            onClick={() => {
              handleDelete(deleteDialog.id);
              setDeleteDialog({ open: false, id: null, title: "" });
            }}
          >
            Eliminar
          </Button>
        </DialogActions>
      </Dialog>

      {/* Dialogo edicion */}
      <Dialog open={Boolean(sel)} onClose={() => setSel(null)} fullWidth maxWidth="md">
        <DialogTitle>Editar oferta</DialogTitle>
        <DialogContent dividers>
          {sel && (
            <Grid container spacing={2} sx={{ mt: 0.5 }}>
              <Grid item xs={12}>
                <TextField label="Titulo" fullWidth value={sel.title} onChange={(e) => updateSel("title", e.target.value)} />
              </Grid>
              <Grid item xs={12}>
                <TextField label="Descripcion" fullWidth multiline rows={3} value={sel.description} onChange={(e) => updateSel("description", e.target.value)} />
              </Grid>
              <Grid item xs={12}>
                <TextField label="Requisitos" fullWidth multiline rows={2} value={sel.requirements} onChange={(e) => updateSel("requirements", e.target.value)} />
              </Grid>

              {/* Enhanced fields */}
              <Grid item xs={12} sm={6}>
                <FormControl fullWidth>
                  <InputLabel>Tipo de contratacion</InputLabel>
                  <Select value={sel.contract_type || "efectivo"} label="Tipo de contratacion" onChange={(e) => updateSel("contract_type", e.target.value)}>
                    <MenuItem value="ocasional">Ocasional</MenuItem>
                    <MenuItem value="temporal">Temporal</MenuItem>
                    <MenuItem value="contrato">Contrato</MenuItem>
                    <MenuItem value="efectivo">Efectivo</MenuItem>
                    <MenuItem value="freelance">Freelance</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} sm={6}>
                <FormControl fullWidth>
                  <InputLabel>Modalidad</InputLabel>
                  <Select value={sel.modality || "presencial"} label="Modalidad" onChange={(e) => updateSel("modality", e.target.value)}>
                    <MenuItem value="presencial">Presencial</MenuItem>
                    <MenuItem value="remoto">Remoto</MenuItem>
                    <MenuItem value="hibrido">Hibrido</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12}>
                <TextField label="Ubicacion" fullWidth value={sel.location || ""} onChange={(e) => updateSel("location", e.target.value)} />
              </Grid>
              <Grid item xs={12} sm={4}>
                <TextField label="Sueldo minimo" type="number" fullWidth value={sel.salary_min || ""} onChange={(e) => updateSel("salary_min", e.target.value ? Number(e.target.value) : null)} />
              </Grid>
              <Grid item xs={12} sm={4}>
                <TextField label="Sueldo maximo" type="number" fullWidth value={sel.salary_max || ""} onChange={(e) => updateSel("salary_max", e.target.value ? Number(e.target.value) : null)} />
              </Grid>
              <Grid item xs={12} sm={4}>
                <FormControlLabel
                  control={<Checkbox checked={sel.salary_visible !== false} onChange={(e) => updateSel("salary_visible", e.target.checked)} />}
                  label="Mostrar sueldo"
                />
              </Grid>

              {/* Banner */}
              <Grid item xs={12}>
                <Typography variant="body2" gutterBottom>Banner</Typography>
                {editBannerPreview ? (
                  <Box sx={{ position: "relative", mb: 1 }}>
                    <Box component="img" src={editBannerPreview} alt="Banner" sx={{ width: "100%", maxHeight: 140, objectFit: "cover", borderRadius: 1 }} />
                    <IconButton size="small" onClick={() => { setEditBannerFile(null); setEditBannerPreview(null); updateSel("banner_url", null); }}
                      sx={{ position: "absolute", top: 4, right: 4, bgcolor: "rgba(0,0,0,0.5)", color: "#fff" }}>
                      <CloseIcon fontSize="small" />
                    </IconButton>
                  </Box>
                ) : (
                  <Button variant="outlined" component="label" startIcon={<CloudUploadIcon />} size="small">
                    Subir imagen
                    <input type="file" hidden accept="image/*" onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) { setEditBannerFile(file); setEditBannerPreview(URL.createObjectURL(file)); }
                    }} />
                  </Button>
                )}
              </Grid>

              {/* Benefits chips */}
              <Grid item xs={12}>
                <Typography variant="body2" gutterBottom>Beneficios</Typography>
                <Box sx={{ display: "flex", gap: 1, mb: 1 }}>
                  <TextField size="small" placeholder="Ej: Comida incluida" value={editBenefitInput}
                    onChange={(e) => setEditBenefitInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        const val = editBenefitInput.trim();
                        if (val && !(sel.benefits || []).includes(val)) updateSel("benefits", [...(sel.benefits || []), val]);
                        setEditBenefitInput("");
                      }
                    }}
                    fullWidth />
                  <Button variant="outlined" size="small" onClick={() => {
                    const val = editBenefitInput.trim();
                    if (val && !(sel.benefits || []).includes(val)) updateSel("benefits", [...(sel.benefits || []), val]);
                    setEditBenefitInput("");
                  }}>Agregar</Button>
                </Box>
                <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.5 }}>
                  {(sel.benefits || []).map((b, i) => (
                    <Chip key={i} label={b} size="small" onDelete={() => updateSel("benefits", (sel.benefits || []).filter((_, j) => j !== i))} />
                  ))}
                </Box>
              </Grid>

              {/* Tags chips */}
              <Grid item xs={12}>
                <Typography variant="body2" gutterBottom>Tags</Typography>
                <Box sx={{ display: "flex", gap: 1, mb: 1 }}>
                  <TextField size="small" placeholder="Agregar tag..." value={editTagInput}
                    onChange={(e) => setEditTagInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        const val = editTagInput.trim().toLowerCase().replace(/\s+/g, "-").replace(/^#/, "");
                        if (val && !(sel.tags || []).includes(val)) updateSel("tags", [...(sel.tags || []), val]);
                        setEditTagInput("");
                      }
                    }}
                    fullWidth />
                  <Button variant="outlined" size="small" onClick={() => {
                    const val = editTagInput.trim().toLowerCase().replace(/\s+/g, "-").replace(/^#/, "");
                    if (val && !(sel.tags || []).includes(val)) updateSel("tags", [...(sel.tags || []), val]);
                    setEditTagInput("");
                  }}>Agregar</Button>
                </Box>
                <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.5 }}>
                  {(sel.tags || []).map((t, i) => (
                    <Chip key={i} label={`#${t}`} size="small" color="info" variant="outlined"
                      onDelete={() => updateSel("tags", (sel.tags || []).filter((_, j) => j !== i))} />
                  ))}
                </Box>
              </Grid>

              {/* Original config fields */}
              <Grid item xs={12} sm={6}>
                <TextField
                  label="Fecha de expiracion"
                  type="date"
                  fullWidth
                  InputLabelProps={{ shrink: true }}
                  value={sel.expirationDate?.slice(0, 10) || ""}
                  onChange={(e) => updateSel("expirationDate", e.target.value)}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  label="E-mail de contacto"
                  type="email"
                  fullWidth
                  value={sel.contactEmail}
                  onChange={(e) => updateSel("contactEmail", e.target.value)}
                  required={sel.source === "admin"}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  label="Telefono de contacto"
                  fullWidth
                  value={sel.contactPhone}
                  onChange={(e) => updateSel("contactPhone", e.target.value)}
                />
              </Grid>
              <Grid item xs={6} sm={3}>
                <TextField
                  select
                  label="Etiqueta"
                  fullWidth
                  SelectProps={{ native: true }}
                  value={sel.label}
                  onChange={(e) => updateSel("label", e.target.value)}
                >
                  <option value="automatic">Automatico</option>
                  <option value="manual">Manual</option>
                </TextField>
              </Grid>
              <Grid item xs={6} sm={3}>
                <TextField
                  select
                  label="Fuente"
                  fullWidth
                  SelectProps={{ native: true }}
                  value={sel.source}
                  onChange={(e) => updateSel("source", e.target.value)}
                >
                  <option value="admin">Administrador</option>
                  <option value="employer">Empleador</option>
                  <option value="instagram">Instagram</option>
                </TextField>
              </Grid>
            </Grid>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setSel(null)}>Cancelar</Button>
          <Button variant="contained" onClick={handleSave}>
            Guardar
          </Button>
        </DialogActions>
      </Dialog>

      {/* Snackbar */}
      <Snackbar
        open={snack.open}
        autoHideDuration={4000}
        anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
        onClose={() => setSnack((s) => ({ ...s, open: false }))}
      >
        <Alert severity={snack.sev} variant="filled">
          {snack.msg}
        </Alert>
      </Snackbar>
    </DashboardLayout>
  );
}

export async function getServerSideProps() {
  return { props: {} };
}
