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
  DialogActions,
  TextField,
  Snackbar,
  Alert,
  CircularProgress,
  Chip,
} from "@mui/material";
import { useRouter } from "next/router";
import DashboardLayout from "../../components/DashboardLayout";
import useAdminAuth from "../../hooks/useAdminAuth";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "https://api.fapmendoza.online";

const fmtDate  = (d) => (d ? new Date(d).toLocaleDateString("es-AR") : "Sin fecha");
const fmtLabel = (l) => (l === "manual" ? "Manual" : "Automático");

export default function MisOfertas({ toggleDarkMode, currentMode }) {
  const { user, loading } = useAdminAuth();
  const [offers, setOffers] = useState([]);
  const [sel, setSel] = useState(null);
  const [busy, setBusy] = useState(false);
  const [snack, setSnack] = useState({ open: false, msg: "", sev: "success" });

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
      .catch((err) => {
        console.error("Error obteniendo ofertas:", err);
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
    if (!confirm("¿Eliminar esta oferta?")) return;
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
    } catch (e) {
      console.error("Error eliminando oferta:", e);
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
    } catch (e) {
      console.error("Error actualizando oferta:", e);
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
                  <TableCell colSpan={9} align="center">
                    No hay ofertas
                  </TableCell>
                </TableRow>
              ) : (
                offers.map((o) => {
                  const email = o.contactEmail ?? o.contact_email ?? "—";
                  const phone = o.contactPhone ?? o.contact_phone ?? "—";
                  const isHighlight = o.id === highlightId.current;
                  return (
                    <TableRow
                      key={o.id}
                      id={`offer-row-${o.id}`}
                      sx={{
                        backgroundColor: isHighlight
                          ? "#fff9c4"
                          : o.userId === user.id
                          ? "#FFFDE7"
                          : "inherit",
                      }}
                    >
                      <TableCell>{o.title}</TableCell>
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
                          onClick={() => handleDelete(o.id)}
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

      {/* Dialogo edición */}
      <Dialog open={Boolean(sel)} onClose={() => setSel(null)} fullWidth>
        <DialogTitle>Editar oferta</DialogTitle>
        <DialogContent dividers>
          {sel && (
            <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
              <TextField
                label="Título"
                fullWidth
                value={sel.title}
                onChange={(e) => updateSel("title", e.target.value)}
              />
              <TextField
                label="Descripción"
                fullWidth
                multiline
                rows={3}
                value={sel.description}
                onChange={(e) => updateSel("description", e.target.value)}
              />
              <TextField
                label="Requisitos"
                fullWidth
                multiline
                rows={2}
                value={sel.requirements}
                onChange={(e) => updateSel("requirements", e.target.value)}
              />
              <TextField
                label="Fecha de expiración"
                type="date"
                fullWidth
                InputLabelProps={{ shrink: true }}
                value={sel.expirationDate?.slice(0, 10) || ""}
                onChange={(e) => updateSel("expirationDate", e.target.value)}
              />
              <TextField
                label="E-mail de contacto"
                type="email"
                fullWidth
                value={sel.contactEmail}
                onChange={(e) => updateSel("contactEmail", e.target.value)}
                required={sel.source === "admin"}
              />
              <TextField
                label="Teléfono de contacto"
                fullWidth
                value={sel.contactPhone}
                onChange={(e) => updateSel("contactPhone", e.target.value)}
              />
              <TextField
                select
                label="Etiqueta"
                SelectProps={{ native: true }}
                value={sel.label}
                onChange={(e) => updateSel("label", e.target.value)}
              >
                <option value="automatic">Automático</option>
                <option value="manual">Manual</option>
              </TextField>
              <TextField
                select
                label="Fuente"
                SelectProps={{ native: true }}
                value={sel.source}
                onChange={(e) => updateSel("source", e.target.value)}
              >
                <option value="admin">Administrador</option>
                <option value="employer">Empleador</option>
                <option value="instagram">Instagram</option>
              </TextField>
            </Box>
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
