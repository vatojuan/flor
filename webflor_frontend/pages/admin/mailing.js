import { useState, useEffect } from "react";
import {
  Box, Typography, TextField, Button, Select, MenuItem, FormControl,
  InputLabel, Paper, Chip, Alert, CircularProgress, Grid, Divider,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  Dialog, DialogTitle, DialogContent, DialogActions,
} from "@mui/material";
import SendIcon from "@mui/icons-material/Send";
import PreviewIcon from "@mui/icons-material/Preview";
import GroupIcon from "@mui/icons-material/Group";
import DashboardLayout from "../../components/DashboardLayout";
import useAdminAuth from "../../hooks/useAdminAuth";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "https://api.fapmendoza.online";

export default function MailingPage() {
  useAdminAuth();
  const [rubros, setRubros] = useState([]);
  const [selectedRubro, setSelectedRubro] = useState("");
  const [keyword, setKeyword] = useState("");
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [preview, setPreview] = useState(null);
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState(null);
  const [confirmOpen, setConfirmOpen] = useState(false);

  const token = typeof window !== "undefined" ? localStorage.getItem("adminToken") : null;
  const headers = { "Content-Type": "application/json", Authorization: `Bearer ${token}` };

  useEffect(() => {
    fetch(`${API_URL}/api/mailing/rubros`, { headers })
      .then((r) => r.json())
      .then(setRubros)
      .catch(() => {});
  }, []);

  const handlePreview = async () => {
    setLoading(true);
    setResult(null);
    try {
      const res = await fetch(`${API_URL}/api/mailing/preview`, {
        method: "POST",
        headers,
        body: JSON.stringify({ rubro: selectedRubro || null, keyword: keyword || null }),
      });
      const data = await res.json();
      setPreview(data);
    } catch (e) {
      setResult({ severity: "error", text: "Error al obtener preview" });
    } finally {
      setLoading(false);
    }
  };

  const handleSend = async () => {
    setConfirmOpen(false);
    setSending(true);
    setResult(null);
    try {
      const res = await fetch(`${API_URL}/api/mailing/send`, {
        method: "POST",
        headers,
        body: JSON.stringify({
          subject,
          body,
          segment: { rubro: selectedRubro || null, keyword: keyword || null },
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setResult({ severity: "success", text: data.message });
      } else {
        setResult({ severity: "error", text: data.detail || "Error al enviar" });
      }
    } catch (e) {
      setResult({ severity: "error", text: "Error de conexion" });
    } finally {
      setSending(false);
    }
  };

  return (
    <DashboardLayout>
      <Box sx={{ p: 3, maxWidth: 1000, mx: "auto" }}>
        <Typography variant="h4" sx={{ mb: 1, fontWeight: 600 }}>
          Mailing Segmentado
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
          Envia emails personalizados a grupos de candidatos filtrados por rubro o palabra clave.
          Usa {"{nombre}"} en el cuerpo para personalizar.
        </Typography>

        {/* Segment filters */}
        <Paper sx={{ p: 3, mb: 3, borderRadius: 2 }}>
          <Typography variant="h6" sx={{ mb: 2 }}>
            <GroupIcon sx={{ mr: 1, verticalAlign: "middle" }} />
            Segmento
          </Typography>
          <Grid container spacing={2} alignItems="center">
            <Grid item xs={12} sm={4}>
              <FormControl fullWidth size="small">
                <InputLabel>Rubro</InputLabel>
                <Select value={selectedRubro} onChange={(e) => setSelectedRubro(e.target.value)} label="Rubro">
                  <MenuItem value="">Todos</MenuItem>
                  {rubros.map((r) => (
                    <MenuItem key={r.rubro} value={r.rubro}>
                      {r.rubro} ({r.count})
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={4}>
              <TextField
                fullWidth size="small" label="Palabra clave" placeholder="ej: mozo, seguridad..."
                value={keyword} onChange={(e) => setKeyword(e.target.value)}
              />
            </Grid>
            <Grid item xs={12} sm={4}>
              <Button variant="outlined" startIcon={<PreviewIcon />} onClick={handlePreview} disabled={loading} fullWidth>
                {loading ? <CircularProgress size={20} /> : "Ver destinatarios"}
              </Button>
            </Grid>
          </Grid>

          {preview && (
            <Box sx={{ mt: 2 }}>
              <Divider sx={{ my: 2 }} />
              <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 1 }}>
                <Typography variant="subtitle1" fontWeight={600}>
                  {preview.count} destinatarios
                </Typography>
                {preview.rubros_summary && Object.entries(preview.rubros_summary).map(([rb, cnt]) => (
                  <Chip key={rb} label={`${rb}: ${cnt}`} size="small" variant="outlined" />
                ))}
              </Box>
              {preview.recipients && preview.recipients.length > 0 && (
                <TableContainer sx={{ maxHeight: 200 }}>
                  <Table size="small" stickyHeader>
                    <TableHead>
                      <TableRow>
                        <TableCell>Nombre</TableCell>
                        <TableCell>Email</TableCell>
                        <TableCell>Rubro</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {preview.recipients.slice(0, 50).map((r) => (
                        <TableRow key={r.id}>
                          <TableCell>{r.name}</TableCell>
                          <TableCell>{r.email}</TableCell>
                          <TableCell>{r.rubro}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              )}
            </Box>
          )}
        </Paper>

        {/* Email composition */}
        <Paper sx={{ p: 3, mb: 3, borderRadius: 2 }}>
          <Typography variant="h6" sx={{ mb: 2 }}>
            <SendIcon sx={{ mr: 1, verticalAlign: "middle" }} />
            Contenido del Email
          </Typography>
          <TextField
            fullWidth label="Asunto" value={subject}
            onChange={(e) => setSubject(e.target.value)} sx={{ mb: 2 }}
          />
          <TextField
            fullWidth multiline rows={6} label="Cuerpo (HTML)" placeholder="Hola {nombre}, ..."
            value={body} onChange={(e) => setBody(e.target.value)}
          />
        </Paper>

        {/* Send button */}
        <Box sx={{ display: "flex", gap: 2, justifyContent: "flex-end" }}>
          <Button
            variant="contained" size="large" startIcon={sending ? <CircularProgress size={20} color="inherit" /> : <SendIcon />}
            onClick={() => setConfirmOpen(true)}
            disabled={!subject || !body || !preview?.count || sending}
          >
            Enviar a {preview?.count || 0} destinatarios
          </Button>
        </Box>

        {result && (
          <Alert severity={result.severity} sx={{ mt: 2 }}>
            {result.text}
          </Alert>
        )}

        {/* Confirm dialog */}
        <Dialog open={confirmOpen} onClose={() => setConfirmOpen(false)}>
          <DialogTitle>Confirmar envio</DialogTitle>
          <DialogContent>
            <Typography>
              Vas a enviar <strong>{preview?.count || 0}</strong> emails con asunto: <strong>{subject}</strong>
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
              Esta accion no se puede deshacer.
            </Typography>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setConfirmOpen(false)}>Cancelar</Button>
            <Button variant="contained" color="primary" onClick={handleSend}>
              Confirmar envio
            </Button>
          </DialogActions>
        </Dialog>
      </Box>
    </DashboardLayout>
  );
}
