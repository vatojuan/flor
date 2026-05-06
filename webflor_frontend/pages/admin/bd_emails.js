// pages/admin/bd_emails.js

import dynamic from "next/dynamic";
import { useState, useEffect } from "react";
import { useRouter } from "next/router";
import {
  Tabs, Tab, Box, Button, Typography, TextField, Paper, Container,
  List, ListItem, ListItemText, LinearProgress, Snackbar, Alert,
  Card, CardHeader, CardContent, Divider, IconButton,
  Table, TableHead, TableRow, TableCell, TableBody, Checkbox, TableContainer
} from "@mui/material";
import CloudUploadIcon from "@mui/icons-material/CloudUpload";
import DeleteIcon from "@mui/icons-material/Delete";
import SendIcon from "@mui/icons-material/Send";
import useAdminAuth from "../../hooks/useAdminAuth";
import DashboardLayout from "../../components/DashboardLayout";
import axios from "axios";

function BdEmails() {
  const router = useRouter();
  const { user, loading: authLoading } = useAdminAuth();
  const [tab, setTab] = useState(0);

  // TAB 0 state
  const [files, setFiles] = useState([]);
  const [results, setResults] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);

  // TAB 1 state
  const [manual, setManual] = useState({ email: "", name: "", phone: "", notes: "" });

  // TAB 2 state
  const [rows, setRows] = useState([]);
  const [search, setSearch] = useState("");
  const [selection, setSelection] = useState(new Set());
  const [loadingRows, setLoadingRows] = useState(false);
  const [mail, setMail] = useState({ subject: "", body: "" });

  // Snackbar
  const [snack, setSnack] = useState({ open: false, msg: "", sev: "success" });

  const apiRoot = process.env.NEXT_PUBLIC_API_URL;
  const base = `${apiRoot}/api/admin/emails`;
  const token = typeof window !== "undefined" ? localStorage.getItem("adminToken") : null;
  const headers = token ? { Authorization: `Bearer ${token}` } : {};

  const handleSnack = (m, s = "success") => setSnack({ open: true, msg: m, sev: s });

  // redirect if not auth
  useEffect(() => {
    if (!authLoading && !user) router.push("/admin/login");
  }, [authLoading, user, router]);

  // ── TAB 0 ────────────────────────────────────────────────────────
  const handleFileSelect = e => setFiles(Array.from(e.target.files));
  const uploadFiles = async () => {
    if (!files.length) return;
    const fd = new FormData();
    files.forEach(f => fd.append("files", f));
    setUploading(true);
    try {
      const { data } = await axios.post(`${base}/upload`, fd, {
        headers,
        onUploadProgress: e => setProgress(Math.round(e.loaded * 100 / e.total)),
      });
      setResults(data.results);
      handleSnack("Archivos procesados");
      setFiles([]);
    } catch (err) {
      if (err.response?.status === 401) {
        handleSnack("Sesión expirada", "error");
        router.push("/admin/login");
      } else handleSnack("Error procesando archivos", "error");
    } finally {
      setUploading(false);
      setProgress(0);
    }
  };

  // ── TAB 1 ────────────────────────────────────────────────────────
  const addManual = async () => {
    if (!manual.email) return handleSnack("E-mail requerido", "error");
    try {
      await axios.post(`${base}/manual`, manual, { headers });
      handleSnack("Contacto agregado");
      setManual({ email: "", name: "", phone: "", notes: "" });
    } catch (err) {
      if (err.response?.status === 401) {
        handleSnack("Sesión expirada", "error");
        router.push("/admin/login");
      } else handleSnack(err.response?.data?.detail || "Error", "error");
    }
  };

  // ── TAB 2 ────────────────────────────────────────────────────────
  const fetchRows = async () => {
    if (!token) return;
    setLoadingRows(true);
    try {
      const { data } = await axios.get(base, {
        params: { search, page: 1, page_size: 200 },
        headers,
      });
      setRows(data.items);
    } catch (err) {
      if (err.response?.status === 401) {
        handleSnack("No autorizado", "error");
        router.push("/admin/login");
      } else {
        console.error(err);
        handleSnack("No se pudieron cargar los contactos", "error");
      }
    } finally {
      setLoadingRows(false);
    }
  };
  useEffect(() => { if (tab === 2 && !authLoading) fetchRows(); }, [tab, authLoading]);

  const toggleSelect = id => setSelection(prev => {
    const nxt = new Set(prev);
    nxt.has(id) ? nxt.delete(id) : nxt.add(id);
    return nxt;
  });

  const deleteRow = async id => {
    try {
      await axios.delete(`${base}/${id}`, { headers });
      setRows(r => r.filter(x => x.id !== id));
      setSelection(s => { s.delete(id); return new Set(s); });
    } catch (err) {
      if (err.response?.status === 401) {
        handleSnack("No autorizado", "error");
        router.push("/admin/login");
      } else handleSnack("Error eliminando", "error");
    }
  };

  const sendBulk = async () => {
    if (!mail.subject || !mail.body) return handleSnack("Asunto y cuerpo requeridos", "error");
    try {
      await axios.post(`${base}/send_bulk`, {
        subject: mail.subject,
        body: mail.body,
        ids: [...selection]
      }, { headers });
      handleSnack("E-mails encolados");
      setMail({ subject: "", body: "" });
    } catch (err) {
      if (err.response?.status === 401) {
        handleSnack("No autorizado", "error");
        router.push("/admin/login");
      } else handleSnack("Error enviando", "error");
    }
  };

  if (authLoading || !user) return null;

  return (
    <DashboardLayout>
      <Container maxWidth="xl" sx={{ py: 4 }}>
        <Paper sx={{ p: 3 }}>
          <Typography variant="h4" align="center" gutterBottom>
            BD E-mails
          </Typography>
          <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ mb: 3 }}>
            <Tab label="Importar archivos" />
            <Tab label="Añadir manual" />
            <Tab label="Listado & Mailing" />
          </Tabs>

          {tab === 0 && <>
            <Button variant="contained" component="label" startIcon={<CloudUploadIcon />}>
              Seleccionar archivos
              <input type="file" hidden multiple accept=".pdf,.doc,.docx,.txt" onChange={handleFileSelect} />
            </Button>
            {files.length > 0 && (
              <Box mt={2}>
                <List dense>
                  {files.map(f => <ListItem key={f.name}><ListItemText primary={f.name} /></ListItem>)}
                </List>
                <Button variant="contained" onClick={uploadFiles}>Procesar</Button>
              </Box>
            )}
            {uploading && (
              <Box mt={2}>
                <LinearProgress variant="determinate" value={progress}/> <Typography>{progress}%</Typography>
              </Box>
            )}
            {results.length > 0 && (
              <Box mt={4}>
                <Box display="flex" justifyContent="space-between">
                  <Typography variant="h6">Resultados</Typography>
                  <IconButton onClick={() => setResults([])}><DeleteIcon/></IconButton>
                </Box>
                {results.map((r, i) =>
                  <Card key={i} sx={{ my: 2 }}>
                    <CardHeader title={`${r.file} – ${r.email||"sin email"}`} subheader={r.status}/>
                    <Divider/>
                    <CardContent>
                      <List dense>
                        {r.logs.map((l,idx) => <ListItem key={idx}><ListItemText primary={l}/></ListItem>)}
                      </List>
                    </CardContent>
                  </Card>
                )}
              </Box>
            )}
          </>}

          {tab === 1 && (
            <Box component="form" sx={{ display:"flex", flexDirection:"column", gap:2, maxWidth:400 }}>
              <TextField label="E-mail*" value={manual.email} onChange={e => setManual({...manual,email:e.target.value})} />
              <TextField label="Nombre" value={manual.name} onChange={e => setManual({...manual,name:e.target.value})} />
              <TextField label="Teléfono" value={manual.phone} onChange={e => setManual({...manual,phone:e.target.value})} />
              <TextField label="Notas" multiline rows={3} value={manual.notes} onChange={e => setManual({...manual,notes:e.target.value})} />
              <Button variant="contained" onClick={addManual}>Guardar</Button>
            </Box>
          )}

          {tab === 2 && <>
            <Box sx={{ mb:2, display:"flex", gap:2 }}>
              <TextField label="Buscar e-mail / nombre" size="small" value={search} onChange={e => setSearch(e.target.value)} />
              <Button variant="contained" onClick={fetchRows}>Buscar</Button>
            </Box>
            <TableContainer component={Paper} variant="outlined">
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell padding="checkbox"/>
                    <TableCell>E-mail</TableCell>
                    <TableCell>Nombre</TableCell>
                    <TableCell>Teléfono</TableCell>
                    <TableCell>Notas</TableCell>
                    <TableCell>Acciones</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {rows.map(row => (
                    <TableRow key={row.id} hover>
                      <TableCell padding="checkbox">
                        <Checkbox checked={selection.has(row.id)} onChange={() => toggleSelect(row.id)} />
                      </TableCell>
                      <TableCell>{row.email}</TableCell>
                      <TableCell>{row.name}</TableCell>
                      <TableCell>{row.phone}</TableCell>
                      <TableCell>{row.notes}</TableCell>
                      <TableCell>
                        <IconButton size="small" onClick={() => deleteRow(row.id)}>
                          <DeleteIcon/>
                        </IconButton>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>

            <Box sx={{ mt:3, maxWidth:600, display:"flex", flexDirection:"column", gap:2 }}>
              <Typography variant="h6">
                Enviar mailing {selection.size ? `(seleccionados: ${selection.size})` : "(toda la base)"}
              </Typography>
              <TextField label="Asunto" value={mail.subject} onChange={e => setMail({...mail,subject:e.target.value})} />
              <TextField label="Cuerpo" multiline rows={6} value={mail.body} onChange={e => setMail({...mail,body:e.target.value})} />
              <Button variant="contained" startIcon={<SendIcon />} onClick={sendBulk}>
                Enviar
              </Button>
            </Box>
          </>}

        </Paper>

        <Snackbar open={snack.open} autoHideDuration={4000} onClose={() => setSnack(prev => ({ ...prev, open: false }))}>
          <Alert severity={snack.sev} variant="filled" sx={{ width: "100%" }}>
            {snack.msg}
          </Alert>
        </Snackbar>

      </Container>
    </DashboardLayout>
  );
}

// Deshabilitar SSR para evitar desincronización por auth
export default dynamic(() => Promise.resolve(BdEmails), { ssr: false });
