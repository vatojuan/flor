import React, { useEffect, useState } from "react";
import {
  Box, Typography, Chip, Button, CircularProgress, Alert, Snackbar,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper,
  Grid, TextField, Select, MenuItem, FormControl, InputLabel, IconButton,
  Tooltip, Dialog, DialogTitle, DialogContent, DialogActions,
} from "@mui/material";
import SendIcon from "@mui/icons-material/Send";
import RefreshIcon from "@mui/icons-material/Refresh";
import StarIcon from "@mui/icons-material/Star";
import EmailIcon from "@mui/icons-material/Email";
import PersonIcon from "@mui/icons-material/Person";
import DashboardLayout from "../../components/DashboardLayout";
import useAdminAuth from "../../hooks/useAdminAuth";

const API = process.env.NEXT_PUBLIC_API_URL;

export default function Matchins() {
  useAdminAuth();

  const [rows, setRows] = useState([]);
  const [rubros, setRubros] = useState([]);
  const [loading, setLoading] = useState(true);
  const [snack, setSnack] = useState({ open: false, msg: "", sev: "success" });

  // Filters
  const [filterRubro, setFilterRubro] = useState("");
  const [filterJobId, setFilterJobId] = useState("");
  const [onlyPending, setOnlyPending] = useState(false);

  // Send all dialog
  const [sendDialog, setSendDialog] = useState({ open: false, jobId: null, jobTitle: "" });
  const [sending, setSending] = useState(false);

  const headers = () => {
    const token = localStorage.getItem("adminToken");
    return { "Content-Type": "application/json", Authorization: `Bearer ${token}` };
  };

  const fetchData = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ min_score: "0.70" });
      if (filterRubro) params.append("rubro", filterRubro);
      if (filterJobId) params.append("job_id", filterJobId);
      if (onlyPending) params.append("only_pending", "true");

      const res = await fetch(`${API}/api/match/admin?${params}`, { headers: headers() });
      if (!res.ok) throw new Error();
      setRows(await res.json());
    } catch {
      setSnack({ open: true, msg: "Error cargando matchings", sev: "error" });
    }
    setLoading(false);
  };

  const fetchRubros = async () => {
    try {
      const res = await fetch(`${API}/api/match/rubros`, { headers: headers() });
      if (res.ok) setRubros(await res.json());
    } catch {}
  };

  useEffect(() => { fetchRubros(); }, []);
  useEffect(() => { fetchData(); }, [filterRubro, filterJobId, onlyPending]);

  const resendEmail = async (matchId) => {
    try {
      const res = await fetch(`${API}/api/match/resend/${matchId}`, { method: "POST", headers: headers() });
      if (res.ok) {
        setSnack({ open: true, msg: "Email reenviado", sev: "success" });
        fetchData();
      } else throw new Error();
    } catch {
      setSnack({ open: true, msg: "Error al reenviar", sev: "error" });
    }
  };

  const sendAllForJob = async () => {
    setSending(true);
    try {
      const res = await fetch(`${API}/api/match/send-notifications/${sendDialog.jobId}`, {
        method: "POST", headers: headers(),
      });
      const data = await res.json();
      if (res.ok) {
        setSnack({ open: true, msg: data.message, sev: "success" });
        fetchData();
      } else throw new Error(data.detail);
    } catch (e) {
      setSnack({ open: true, msg: "Error enviando notificaciones", sev: "error" });
    }
    setSending(false);
    setSendDialog({ open: false, jobId: null, jobTitle: "" });
  };

  // Group matches by job for the "send all" feature
  const jobsWithPending = {};
  rows.forEach((m) => {
    if (m.status === "pending") {
      const jid = m.job.id;
      if (!jobsWithPending[jid]) jobsWithPending[jid] = { title: m.job.title, is_paid: m.job.is_paid, count: 0 };
      jobsWithPending[jid].count++;
    }
  });

  return (
    <DashboardLayout>
      <Box sx={{ p: 3 }}>
        <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 2 }}>
          <Typography variant="h4" fontWeight={600}>Matchings</Typography>
          <Button startIcon={<RefreshIcon />} onClick={fetchData} variant="outlined" size="small">
            Actualizar
          </Button>
        </Box>

        {/* Jobs with pending matches — admin can send notifications */}
        {Object.keys(jobsWithPending).length > 0 && (
          <Paper sx={{ p: 2, mb: 3, borderRadius: 2, bgcolor: "action.hover" }}>
            <Typography variant="subtitle2" sx={{ mb: 1 }}>
              Ofertas con matches pendientes (sin notificar):
            </Typography>
            <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1 }}>
              {Object.entries(jobsWithPending).map(([jid, info]) => (
                <Chip
                  key={jid}
                  icon={info.is_paid ? <StarIcon /> : <EmailIcon />}
                  label={`${info.title} (${info.count} candidatos)`}
                  color={info.is_paid ? "warning" : "default"}
                  variant="outlined"
                  onClick={() => setSendDialog({ open: true, jobId: Number(jid), jobTitle: info.title })}
                  sx={{ cursor: "pointer" }}
                />
              ))}
            </Box>
          </Paper>
        )}

        {/* Filters */}
        <Grid container spacing={2} sx={{ mb: 3 }}>
          <Grid item xs={12} sm={3}>
            <FormControl fullWidth size="small">
              <InputLabel>Rubro</InputLabel>
              <Select value={filterRubro} label="Rubro" onChange={(e) => setFilterRubro(e.target.value)}>
                <MenuItem value="">Todos</MenuItem>
                {rubros.map((r) => <MenuItem key={r} value={r}>{r}</MenuItem>)}
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} sm={3}>
            <TextField fullWidth size="small" label="ID de oferta" type="number"
              value={filterJobId} onChange={(e) => setFilterJobId(e.target.value)} />
          </Grid>
          <Grid item xs={12} sm={3}>
            <FormControl fullWidth size="small">
              <InputLabel>Estado</InputLabel>
              <Select value={onlyPending ? "pending" : "all"} label="Estado"
                onChange={(e) => setOnlyPending(e.target.value === "pending")}>
                <MenuItem value="all">Todos</MenuItem>
                <MenuItem value="pending">Solo pendientes</MenuItem>
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} sm={3}>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
              {rows.length} resultados
            </Typography>
          </Grid>
        </Grid>

        {/* Table */}
        {loading ? (
          <Box sx={{ display: "flex", justifyContent: "center", mt: 4 }}><CircularProgress /></Box>
        ) : (
          <TableContainer component={Paper} sx={{ borderRadius: 2 }}>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Oferta</TableCell>
                  <TableCell>Candidato</TableCell>
                  <TableCell>Rubro</TableCell>
                  <TableCell>Score</TableCell>
                  <TableCell>Estado</TableCell>
                  <TableCell>Enviado</TableCell>
                  <TableCell>Acciones</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {rows.map((m) => {
                  const score = (m.score * 100).toFixed(0);
                  return (
                    <TableRow key={m.id} hover>
                      <TableCell>
                        <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
                          {m.job.is_paid && <StarIcon fontSize="small" sx={{ color: "warning.main" }} />}
                          {m.job.title}
                        </Box>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2">{m.user.name || "—"}</Typography>
                        <Typography variant="caption" color="text.secondary">{m.user.email}</Typography>
                      </TableCell>
                      <TableCell>
                        <Chip label={m.user.rubro || "General"} size="small" variant="outlined" />
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={`${score}%`}
                          size="small"
                          color={score >= 85 ? "success" : score >= 78 ? "primary" : "default"}
                        />
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={m.status === "sent" ? "Enviado" : m.status === "pending" ? "Pendiente" : m.status}
                          size="small"
                          color={m.status === "sent" ? "success" : m.status === "pending" ? "warning" : "default"}
                          variant="outlined"
                        />
                      </TableCell>
                      <TableCell>
                        {m.sent_at ? new Date(m.sent_at).toLocaleString("es-AR") : "—"}
                      </TableCell>
                      <TableCell>
                        <Box sx={{ display: "flex", gap: 0.5 }}>
                          <Tooltip title="Enviar/Reenviar email al candidato">
                            <IconButton size="small" color="primary" onClick={() => resendEmail(m.id)}>
                              <SendIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="Ver perfil del candidato">
                            <IconButton size="small" onClick={() => window.open(`/candidato/${m.user.id}`, "_blank")}>
                              <PersonIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                        </Box>
                      </TableCell>
                    </TableRow>
                  );
                })}
                {rows.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={7} align="center">No hay matchings con los filtros seleccionados</TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </TableContainer>
        )}

        {/* Send all dialog */}
        <Dialog open={sendDialog.open} onClose={() => setSendDialog({ open: false, jobId: null, jobTitle: "" })}>
          <DialogTitle>Enviar notificaciones</DialogTitle>
          <DialogContent>
            <Typography>
              Enviar email a todos los candidatos pendientes que matchean con <strong>{sendDialog.jobTitle}</strong>?
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
              Solo se notificara a candidatos con score mayor a {(NOTIFY_THRESHOLD || 0.78) * 100}% que no hayan sido notificados aun.
            </Typography>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setSendDialog({ open: false, jobId: null, jobTitle: "" })}>Cancelar</Button>
            <Button variant="contained" onClick={sendAllForJob} disabled={sending}
              startIcon={sending ? <CircularProgress size={16} /> : <SendIcon />}>
              Enviar
            </Button>
          </DialogActions>
        </Dialog>

        <Snackbar open={snack.open} autoHideDuration={4000}
          onClose={() => setSnack({ ...snack, open: false })}
          anchorOrigin={{ vertical: "bottom", horizontal: "center" }}>
          <Alert severity={snack.sev} variant="filled" onClose={() => setSnack({ ...snack, open: false })}>
            {snack.msg}
          </Alert>
        </Snackbar>
      </Box>
    </DashboardLayout>
  );
}

const NOTIFY_THRESHOLD = 0.78;
