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
} from "@mui/material";
import { alpha, useTheme } from "@mui/material/styles";
import StarIcon from "@mui/icons-material/Star";
import { useRouter } from "next/router";
import DashboardLayout from "../../components/DashboardLayout";
import useAdminAuth from "../../hooks/useAdminAuth";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "https://api.fapmendoza.online";

const fmtDate  = (d) => (d ? new Date(d).toLocaleDateString("es-AR") : "Sin fecha");
const fmtLabel = (l) => (l === "manual" ? "Manual" : "Automático");

export default function MisOfertas({ toggleDarkMode, currentMode }) {
  const { user, loading } = useAdminAuth();
  const theme = useTheme();
  const [offers, setOffers] = useState([]);
  const [sel, setSel] = useState(null);
  const [busy, setBusy] = useState(false);
  const [snack, setSnack] = useState({ open: false, msg: "", sev: "success" });

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
      const res = await fetch(`${API_URL}/api/job/update-admin`, {
        method: "PUT",
        headers,
        body: JSON.stringify(sel),
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
                  "Título",
                  "Rubro",
                  "Descripción",
                  "Requisitos",
                  "Expira",
                  "Etiqueta",
                  "Fuente",
                  "E-mail contacto",
                  "Teléfono",
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
                  const email = o.contactEmail ?? o.contact_email ?? "—";
                  const phone = o.contactPhone ?? o.contact_phone ?? "—";
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
                          "—"
                        )}
                      </TableCell>
                      <TableCell>{o.description}</TableCell>
                      <TableCell>{o.requirements}</TableCell>
                      <TableCell>{fmtDate(o.expirationDate)}</TableCell>
                      <TableCell>
                        <Chip label={fmtLabel(o.label)} size="small" />
                      </TableCell>
                      <TableCell>{o.source ?? "—"}</TableCell>
                      <TableCell>{email}</TableCell>
                      <TableCell>{phone}</TableCell>
                      <TableCell>
                        <Button
                          size="small"
                          variant="outlined"
                          sx={{ mr: 1 }}
                          onClick={() =>
                            setSel({
                              ...o,
                              contactEmail: email === "—" ? "" : email,
                              contactPhone: phone === "—" ? "" : phone,
                            })
                          }
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
        <DialogTitle>Confirmar eliminación</DialogTitle>
        <DialogContent>
          <DialogContentText>
            ¿Estás seguro de que deseas eliminar la oferta <strong>{deleteDialog.title}</strong>? Esta acción no se puede deshacer.
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

      {/* Dialogo edición */}
      <Dialog open={Boolean(sel)} onClose={() => setSel(null)} fullWidth maxWidth="sm">
        <DialogTitle>Editar oferta</DialogTitle>
        <DialogContent dividers>
          {sel && (
            <Grid container spacing={2} sx={{ mt: 0.5 }}>
              <Grid item xs={12}>
                <TextField
                  label="Título"
                  fullWidth
                  value={sel.title}
                  onChange={(e) => updateSel("title", e.target.value)}
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  label="Descripción"
                  fullWidth
                  multiline
                  rows={3}
                  value={sel.description}
                  onChange={(e) => updateSel("description", e.target.value)}
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  label="Requisitos"
                  fullWidth
                  multiline
                  rows={2}
                  value={sel.requirements}
                  onChange={(e) => updateSel("requirements", e.target.value)}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  label="Fecha de expiración"
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
                  label="Teléfono de contacto"
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
                  <option value="automatic">Automático</option>
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
