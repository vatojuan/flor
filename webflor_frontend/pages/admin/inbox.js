import { useState, useEffect } from "react";
import {
  Box, Typography, Paper, TextField, Button, Grid, Alert, Chip,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  IconButton, Dialog, DialogTitle, DialogContent, DialogActions,
  CircularProgress, Divider, Accordion, AccordionSummary, AccordionDetails,
} from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import DeleteIcon from "@mui/icons-material/Delete";
import SyncIcon from "@mui/icons-material/Sync";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import InboxIcon from "@mui/icons-material/Inbox";
import DashboardLayout from "../../components/DashboardLayout";
import useAdminAuth from "../../hooks/useAdminAuth";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "https://api.fapmendoza.online";

export default function InboxPage() {
  useAdminAuth();
  const [accounts, setAccounts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [scanning, setScanning] = useState(null);
  const [scanResults, setScanResults] = useState(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [result, setResult] = useState(null);
  const [newAccount, setNewAccount] = useState({
    name: "", email: "", password: "", imap_host: "imap.gmail.com", imap_port: 993,
  });

  const token = typeof window !== "undefined" ? localStorage.getItem("adminToken") : null;
  const headers = { "Content-Type": "application/json", Authorization: `Bearer ${token}` };

  const fetchAccounts = async () => {
    try {
      const res = await fetch(`${API_URL}/api/inbox/accounts`, { headers });
      setAccounts(await res.json());
    } catch (e) {
      setResult({ severity: "error", text: "Error cargando cuentas" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchAccounts(); }, []);

  const handleAdd = async () => {
    try {
      const res = await fetch(`${API_URL}/api/inbox/accounts`, {
        method: "POST", headers, body: JSON.stringify(newAccount),
      });
      if (res.ok) {
        setResult({ severity: "success", text: "Cuenta agregada" });
        setDialogOpen(false);
        setNewAccount({ name: "", email: "", password: "", imap_host: "imap.gmail.com", imap_port: 993 });
        fetchAccounts();
      } else {
        const err = await res.json();
        setResult({ severity: "error", text: err.detail || "Error al agregar" });
      }
    } catch (e) {
      setResult({ severity: "error", text: "Error de conexion" });
    }
  };

  const handleDelete = async (id) => {
    if (!confirm("Eliminar esta cuenta?")) return;
    await fetch(`${API_URL}/api/inbox/accounts/${id}`, { method: "DELETE", headers });
    fetchAccounts();
  };

  const handleScan = async (accountId) => {
    setScanning(accountId);
    setScanResults(null);
    try {
      const res = await fetch(`${API_URL}/api/inbox/scan/${accountId}`, { method: "POST", headers });
      const data = await res.json();
      setScanResults(data);
      fetchAccounts();
    } catch (e) {
      setResult({ severity: "error", text: "Error ejecutando scan" });
    } finally {
      setScanning(null);
    }
  };

  const handleScanAll = async () => {
    setScanning("all");
    setScanResults(null);
    try {
      const res = await fetch(`${API_URL}/api/inbox/scan-all`, { method: "POST", headers });
      const data = await res.json();
      setScanResults(data);
      fetchAccounts();
    } catch (e) {
      setResult({ severity: "error", text: "Error ejecutando scan" });
    } finally {
      setScanning(null);
    }
  };

  return (
    <DashboardLayout>
      <Box sx={{ p: 3, maxWidth: 1000, mx: "auto" }}>
        <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 3 }}>
          <Typography variant="h4" fontWeight={600}>
            <InboxIcon sx={{ mr: 1, verticalAlign: "middle" }} />
            Bandejas de Entrada
          </Typography>
          <Box sx={{ display: "flex", gap: 1 }}>
            <Button variant="outlined" startIcon={scanning === "all" ? <CircularProgress size={16} /> : <SyncIcon />}
              onClick={handleScanAll} disabled={!!scanning || accounts.length === 0}>
              Escanear todas
            </Button>
            <Button variant="contained" startIcon={<AddIcon />} onClick={() => setDialogOpen(true)}>
              Agregar cuenta
            </Button>
          </Box>
        </Box>

        {result && <Alert severity={result.severity} sx={{ mb: 2 }} onClose={() => setResult(null)}>{result.text}</Alert>}

        {/* Accounts table */}
        <TableContainer component={Paper} sx={{ mb: 3, borderRadius: 2 }}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Nombre</TableCell>
                <TableCell>Email</TableCell>
                <TableCell>Host</TableCell>
                <TableCell>Ultimo scan</TableCell>
                <TableCell>Procesados</TableCell>
                <TableCell>Acciones</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {loading ? (
                <TableRow><TableCell colSpan={6} align="center"><CircularProgress size={24} /></TableCell></TableRow>
              ) : accounts.length === 0 ? (
                <TableRow><TableCell colSpan={6} align="center">No hay cuentas configuradas</TableCell></TableRow>
              ) : accounts.map((acc) => (
                <TableRow key={acc.id}>
                  <TableCell>{acc.name}</TableCell>
                  <TableCell>{acc.email}</TableCell>
                  <TableCell><Chip label={acc.imap_host} size="small" variant="outlined" /></TableCell>
                  <TableCell>{acc.last_scan ? new Date(acc.last_scan).toLocaleString("es-AR") : "Nunca"}</TableCell>
                  <TableCell>{acc.emails_processed || 0}</TableCell>
                  <TableCell>
                    <IconButton color="primary" onClick={() => handleScan(acc.id)}
                      disabled={!!scanning}>
                      {scanning === acc.id ? <CircularProgress size={20} /> : <SyncIcon />}
                    </IconButton>
                    <IconButton color="error" onClick={() => handleDelete(acc.id)}>
                      <DeleteIcon />
                    </IconButton>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>

        {/* Scan results */}
        {scanResults && (
          <Accordion defaultExpanded>
            <AccordionSummary expandIcon={<ExpandMoreIcon />}>
              <Typography fontWeight={600}>
                Resultados del ultimo scan
                {scanResults.processed !== undefined && ` — ${scanResults.processed} emails procesados`}
              </Typography>
            </AccordionSummary>
            <AccordionDetails>
              {scanResults.error ? (
                <Alert severity="error">{scanResults.error}</Alert>
              ) : scanResults.results ? (
                // scan-all results
                scanResults.results.map((r, i) => (
                  <Box key={i} sx={{ mb: 2 }}>
                    <Typography variant="subtitle2">{r.account}</Typography>
                    <Typography variant="body2">
                      Procesados: {r.processed} | CVs: {r.cvs} | Propuestas: {r.proposals} | Consultas: {r.inquiries}
                    </Typography>
                  </Box>
                ))
              ) : (
                <Box>
                  <Grid container spacing={2} sx={{ mb: 2 }}>
                    <Grid item><Chip label={`CVs: ${scanResults.cvs || 0}`} color="success" /></Grid>
                    <Grid item><Chip label={`Propuestas: ${scanResults.proposals || 0}`} color="primary" /></Grid>
                    <Grid item><Chip label={`Consultas: ${scanResults.inquiries || 0}`} color="info" /></Grid>
                    <Grid item><Chip label={`Errores: ${scanResults.errors || 0}`} color="error" /></Grid>
                  </Grid>
                  {scanResults.details && scanResults.details.map((d, i) => (
                    <Typography key={i} variant="body2" sx={{ mb: 0.5 }}>
                      {d.category && <Chip label={d.category} size="small" sx={{ mr: 1 }} />}
                      {d.from} — {d.subject}
                      {d.cv_processed && d.cv_processed.status === "created" && (
                        <Chip label={`Cuenta creada: ${d.cv_processed.email}`} size="small" color="success" sx={{ ml: 1 }} />
                      )}
                    </Typography>
                  ))}
                </Box>
              )}
            </AccordionDetails>
          </Accordion>
        )}

        {/* Add account dialog */}
        <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="sm" fullWidth>
          <DialogTitle>Agregar cuenta de email</DialogTitle>
          <DialogContent>
            <Box sx={{ display: "flex", flexDirection: "column", gap: 2, mt: 1 }}>
              <TextField label="Nombre (ej: Gmail Principal)" value={newAccount.name}
                onChange={(e) => setNewAccount((a) => ({ ...a, name: e.target.value }))} />
              <TextField label="Email" type="email" value={newAccount.email}
                onChange={(e) => setNewAccount((a) => ({ ...a, email: e.target.value }))} />
              <TextField label="App Password" type="password" value={newAccount.password}
                onChange={(e) => setNewAccount((a) => ({ ...a, password: e.target.value }))}
                helperText="Genera una App Password en myaccount.google.com/apppasswords" />
              <Grid container spacing={2}>
                <Grid item xs={8}>
                  <TextField fullWidth label="IMAP Host" value={newAccount.imap_host}
                    onChange={(e) => setNewAccount((a) => ({ ...a, imap_host: e.target.value }))} />
                </Grid>
                <Grid item xs={4}>
                  <TextField fullWidth label="Puerto" type="number" value={newAccount.imap_port}
                    onChange={(e) => setNewAccount((a) => ({ ...a, imap_port: Number(e.target.value) }))} />
                </Grid>
              </Grid>
            </Box>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setDialogOpen(false)}>Cancelar</Button>
            <Button variant="contained" onClick={handleAdd} disabled={!newAccount.email || !newAccount.password}>
              Guardar
            </Button>
          </DialogActions>
        </Dialog>
      </Box>
    </DashboardLayout>
  );
}
