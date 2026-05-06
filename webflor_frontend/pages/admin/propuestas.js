// pages/admin/propuestas.js
/**
 * Panel de administración – Propuestas
 * 28-may-2025 – versión alineada con los nuevos estados:
 *   waiting → (auto) sending → sent
 *   pending → sending → sent   (manual)
 * Además:
 *   • elimina setOpen “fantasma”
 *   • chip de estado con más colores
 *   • botón «Enviar» sólo si status === "pending"
 *   • refresh automático tras envío / borrado
 */

import React, { useState, useEffect, useMemo } from "react";
import {
  Container,
  Typography,
  Table,
  TableHead,
  TableBody,
  TableRow,
  TableCell,
  TableContainer,
  Paper,
  Button,
  TextField,
  Snackbar,
  Alert,
  Box,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  CircularProgress,
  Chip,
} from "@mui/material";
import DashboardLayout from "../../components/DashboardLayout";
import useAdminAuth from "../../hooks/useAdminAuth";

/* ══════════════ Utils ══════════════ */
const API_URL = process.env.NEXT_PUBLIC_API_URL || "https://api.fapmendoza.online";

const formatAR = (iso) =>
  iso
    ? new Intl.DateTimeFormat("es-AR", {
        dateStyle: "short",
        timeStyle: "short",
        timeZone: "America/Argentina/Buenos_Aires",
      }).format(new Date(iso))
    : "";

/* ════════════ Main page ════════════ */
export default function PropuestasPage({ toggleDarkMode, currentMode }) {
  const { user, loading: loadingAuth } = useAdminAuth();

  const [data, setData]   = useState([]);          // propuestas crudas
  const [loading, setLoading] = useState(false);   // loading fetch
  const [q, setQ]         = useState("");          // búsqueda
  const [sel, setSel]     = useState(null);        // propuesta seleccionada
  const [snack, setSnack] = useState({ open:false, msg:"", sev:"success" });
  const [refreshFlag, setRefreshFlag] = useState(false);

  /* —— credenciales —— */
  const token   = typeof window !== "undefined" ? localStorage.getItem("adminToken") : null;
  const headers = { "Content-Type":"application/json", ...(token ? { Authorization:`Bearer ${token}` } : {}) };

  /* —— fetch —— */
  useEffect(() => {
    if (!user || !token) return;
    setLoading(true);

    fetch(`${API_URL}/api/proposals/`, { headers })
      .then(async (r) => {
        if (!r.ok) throw new Error((await r.json()).detail ?? `HTTP ${r.status}`);
        return r.json();
      })
      .then((json) => setData(Array.isArray(json.proposals) ? json.proposals : []))
      .catch((err) => {
        console.error("Fetch propuestas:", err);
        setSnack({ open:true, msg:err.message, sev:"error" });
      })
      .finally(() => setLoading(false));
  }, [user, token, refreshFlag]);

  /* —— filtro memo —— */
  const proposals = useMemo(() => {
    const txt = q.trim().toLowerCase();
    if (!txt) return data;
    return data.filter((p) => {
      const jt = (p.job_title       ?? "").toLowerCase();
      const an = (p.applicant_name  ?? "").toLowerCase();
      return jt.includes(txt) || an.includes(txt);
    });
  }, [q, data]);

  /* —— acciones —— */
  const handleSend = async (id) => {
    try {
      const r = await fetch(`${API_URL}/api/proposals/${id}/send`, {
        method:"PATCH", headers
      });
      if (!r.ok) throw new Error((await r.json()).detail ?? `HTTP ${r.status}`);
      setSnack({ open:true, msg:"Propuesta enviada", sev:"success" });
      setRefreshFlag(f => !f);
    } catch (e) {
      setSnack({ open:true, msg:e.message, sev:"error" });
    }
  };

  const handleDeleteCancelled = async (id) => {
    if (!confirm("¿Eliminar propuesta cancelada definitivamente?")) return;
    try {
      const r = await fetch(`${API_URL}/api/proposals/${id}`, {
        method:"DELETE", headers
      });
      if (!r.ok) throw new Error((await r.json()).detail ?? `HTTP ${r.status}`);
      setSnack({ open:true, msg:"Propuesta eliminada", sev:"success" });
      setRefreshFlag(f => !f);
    } catch (e) {
      setSnack({ open:true, msg:e.message, sev:"error" });
    }
  };

  /* —— UI carga / auth —— */
  if (loadingAuth || loading) {
    return (
      <DashboardLayout toggleDarkMode={toggleDarkMode} currentMode={currentMode}>
        <Box sx={{ display:"flex", justifyContent:"center", mt:8 }}><CircularProgress/></Box>
      </DashboardLayout>
    );
  }
  if (!user || !token) return null;

  /* —— render main —— */
  return (
    <DashboardLayout toggleDarkMode={toggleDarkMode} currentMode={currentMode}>
      <Container sx={{ mt:4 }}>
        <Typography variant="h4" gutterBottom>Propuestas</Typography>

        <TextField
          fullWidth
          label="Buscar oferta o postulante"
          value={q}
          onChange={(e)=>setQ(e.target.value)}
          sx={{ mb:2 }}
        />

        <TableContainer component={Paper}>
          <Table size="small">
            <TableHead>
              <TableRow>
                {["ID","Oferta","Postulante","Etiqueta","Estado","Creado","Acciones"]
                  .map(h=><TableCell key={h}>{h}</TableCell>)}
              </TableRow>
            </TableHead>
            <TableBody>
              {proposals.length ? proposals.map(p=>(
                <TableRow key={p.id}>
                  <TableCell>{p.id}</TableCell>
                  <TableCell>{p.job_title}</TableCell>
                  <TableCell>{p.applicant_name}</TableCell>
                  <TableCell>{p.label==="manual"?"Manual":"Automático"}</TableCell>
                  <TableCell>
                    <Chip
                      label={p.status}
                      size="small"
                      color={
                        p.status==="sent"       ? "success" :
                        p.status==="sending"    ? "info"    :
                        p.status==="cancelled"  ? "warning" :
                        p.status==="error_email"? "error"   :
                        "default"
                      }
                    />
                  </TableCell>
                  <TableCell>{formatAR(p.created_at)}</TableCell>
                  <TableCell>
                    <Button size="small" onClick={()=>setSel(p)}>Ver</Button>
                    {p.label==="manual" && p.status==="pending" && (
                      <Button size="small" variant="contained"
                              onClick={()=>handleSend(p.id)} sx={{ ml:1 }}>
                        Enviar
                      </Button>
                    )}
                    {p.status==="cancelled" && (
                      <Button size="small" color="error"
                              onClick={()=>handleDeleteCancelled(p.id)} sx={{ ml:1 }}>
                        Borrar
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              )) : (
                <TableRow>
                  <TableCell colSpan={7} align="center">No hay propuestas</TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </Container>

      {/* detalle modal */}
      <ProposalDialog open={Boolean(sel)} proposal={sel} onClose={()=>setSel(null)} />

      {/* snackbar */}
      <Snackbar
        open={snack.open}
        onClose={()=>setSnack(s=>({...s,open:false}))}
        autoHideDuration={4000}
        anchorOrigin={{ vertical:"bottom", horizontal:"center" }}
      >
        <Alert severity={snack.sev} variant="filled">{snack.msg}</Alert>
      </Snackbar>
    </DashboardLayout>
  );
}

/* ═════════ modal detalle ═════════ */
function ProposalDialog({ open, onClose, proposal }) {
  if (!proposal) return null;

  const rows = [
    ["ID",           proposal.id],
    ["Oferta",       proposal.job_title],
    ["Postulante",   `${proposal.applicant_name} (${proposal.applicant_email || "s/ email"})`],
    ["Etiqueta",     proposal.label==="manual" ? "Manual":"Automático"],
    ["Estado",       proposal.status],
    ["Creado",       formatAR(proposal.created_at)],
    proposal.sent_at && ["Enviado", formatAR(proposal.sent_at)],
    proposal.notes   && ["Notas",   proposal.notes],
  ].filter(Boolean);

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="md">
      <DialogTitle>Detalle de la propuesta</DialogTitle>
      <DialogContent dividers>
        <Box sx={{ display:"flex", flexDirection:"column", gap:1 }}>
          {rows.map(([k,v])=>(
            <Typography key={k}><strong>{k}:</strong> {v}</Typography>
          ))}
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cerrar</Button>
      </DialogActions>
    </Dialog>
  );
}

export async function getServerSideProps() {
  return { props:{} };
}
