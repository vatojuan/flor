import { useState, useEffect } from "react";
import {
  Box, Typography, TextField, Button, Select, MenuItem, FormControl,
  InputLabel, Paper, Chip, Alert, CircularProgress, Grid, Divider,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  Dialog, DialogTitle, DialogContent, DialogActions, Tabs, Tab,
  IconButton, Tooltip, InputAdornment,
} from "@mui/material";
import SendIcon from "@mui/icons-material/Send";
import PreviewIcon from "@mui/icons-material/Preview";
import GroupIcon from "@mui/icons-material/Group";
import AddIcon from "@mui/icons-material/Add";
import DeleteIcon from "@mui/icons-material/Delete";
import SearchIcon from "@mui/icons-material/Search";
import PeopleIcon from "@mui/icons-material/People";
import VisibilityIcon from "@mui/icons-material/Visibility";
import DashboardLayout from "../../components/DashboardLayout";
import useAdminAuth from "../../hooks/useAdminAuth";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "https://api.fapmendoza.online";

export default function MailingPage() {
  useAdminAuth();
  const [tab, setTab] = useState(0);
  const token = typeof window !== "undefined" ? localStorage.getItem("adminToken") : null;
  const headers = { "Content-Type": "application/json", Authorization: `Bearer ${token}` };

  return (
    <DashboardLayout>
      <Box sx={{ p: 3, maxWidth: 1100, mx: "auto" }}>
        <Typography variant="h4" sx={{ mb: 1, fontWeight: 600 }}>Mailing</Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
          Gestiona contactos, crea grupos y envia emails personalizados.
        </Typography>

        <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ mb: 3 }}>
          <Tab label="Contactos" icon={<PeopleIcon />} iconPosition="start" />
          <Tab label="Grupos" icon={<GroupIcon />} iconPosition="start" />
          <Tab label="Enviar" icon={<SendIcon />} iconPosition="start" />
        </Tabs>

        {tab === 0 && <ContactsTab headers={headers} />}
        {tab === 1 && <GroupsTab headers={headers} />}
        {tab === 2 && <SendTab headers={headers} />}
      </Box>
    </DashboardLayout>
  );
}

// ═══════════ TAB 1: Contactos ═══════════
function ContactsTab({ headers }) {
  const [contacts, setContacts] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [rubroFilter, setRubroFilter] = useState("");
  const [rubros, setRubros] = useState([]);
  const [page, setPage] = useState(1);

  useEffect(() => {
    fetch(`${API_URL}/api/mailing/rubros`, { headers }).then(r => r.json()).then(setRubros).catch(() => {});
  }, []);

  useEffect(() => {
    setLoading(true);
    const params = new URLSearchParams({ page, per_page: 50 });
    if (rubroFilter) params.append("rubro", rubroFilter);
    if (search) params.append("keyword", search);
    fetch(`${API_URL}/api/mailing/contacts?${params}`, { headers })
      .then(r => r.json())
      .then(data => { setContacts(data.contacts || []); setTotal(data.total || 0); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [page, rubroFilter, search]);

  return (
    <Box>
      <Grid container spacing={2} sx={{ mb: 2 }}>
        <Grid item xs={12} sm={4}>
          <TextField fullWidth size="small" placeholder="Buscar por nombre o email..."
            value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            InputProps={{ startAdornment: <InputAdornment position="start"><SearchIcon /></InputAdornment> }} />
        </Grid>
        <Grid item xs={12} sm={3}>
          <FormControl fullWidth size="small">
            <InputLabel>Rubro</InputLabel>
            <Select value={rubroFilter} label="Rubro" onChange={(e) => { setRubroFilter(e.target.value); setPage(1); }}>
              <MenuItem value="">Todos</MenuItem>
              {rubros.map(r => <MenuItem key={r.rubro} value={r.rubro}>{r.rubro} ({r.count})</MenuItem>)}
            </Select>
          </FormControl>
        </Grid>
        <Grid item xs={12} sm={5}>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
            {total} contactos activos {rubroFilter && `en ${rubroFilter}`}
          </Typography>
        </Grid>
      </Grid>

      {loading ? <CircularProgress /> : (
        <>
          <TableContainer component={Paper} sx={{ borderRadius: 2 }}>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Nombre</TableCell>
                  <TableCell>Email</TableCell>
                  <TableCell>Telefono</TableCell>
                  <TableCell>Rubro</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {contacts.map(c => (
                  <TableRow key={c.id} hover>
                    <TableCell>{c.name || "—"}</TableCell>
                    <TableCell>{c.email}</TableCell>
                    <TableCell>{c.phone || "—"}</TableCell>
                    <TableCell><Chip label={c.rubro || "General"} size="small" variant="outlined" /></TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
          {total > 50 && (
            <Box sx={{ display: "flex", gap: 1, justifyContent: "center", mt: 2 }}>
              <Button disabled={page <= 1} onClick={() => setPage(p => p - 1)}>Anterior</Button>
              <Typography sx={{ mt: 0.5 }}>Pagina {page} de {Math.ceil(total / 50)}</Typography>
              <Button disabled={page >= Math.ceil(total / 50)} onClick={() => setPage(p => p + 1)}>Siguiente</Button>
            </Box>
          )}
        </>
      )}
    </Box>
  );
}

// ═══════════ TAB 2: Grupos ═══════════
function GroupsTab({ headers }) {
  const [groups, setGroups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [newGroup, setNewGroup] = useState({ name: "", description: "", rubro: "", keyword: "" });
  const [viewMembers, setViewMembers] = useState(null);
  const [members, setMembers] = useState([]);
  const [result, setResult] = useState(null);

  const fetchGroups = () => {
    setLoading(true);
    fetch(`${API_URL}/api/mailing/groups`, { headers })
      .then(r => r.json()).then(setGroups).catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchGroups(); }, []);

  const handleCreate = async () => {
    const filters = {};
    if (newGroup.rubro) filters.rubro = newGroup.rubro;
    if (newGroup.keyword) filters.keyword = newGroup.keyword;

    const res = await fetch(`${API_URL}/api/mailing/groups`, {
      method: "POST", headers,
      body: JSON.stringify({
        name: newGroup.name,
        description: newGroup.description || null,
        filters: Object.keys(filters).length > 0 ? filters : null,
      }),
    });
    if (res.ok) {
      const data = await res.json();
      setResult({ severity: "success", text: `Grupo "${data.name}" creado con ${data.members} miembros` });
      setDialogOpen(false);
      setNewGroup({ name: "", description: "", rubro: "", keyword: "" });
      fetchGroups();
    } else {
      setResult({ severity: "error", text: "Error creando grupo" });
    }
  };

  const handleDelete = async (id) => {
    if (!confirm("Eliminar este grupo?")) return;
    await fetch(`${API_URL}/api/mailing/groups/${id}`, { method: "DELETE", headers });
    fetchGroups();
  };

  const handleViewMembers = async (groupId) => {
    const res = await fetch(`${API_URL}/api/mailing/groups/${groupId}/members`, { headers });
    const data = await res.json();
    setMembers(data.members || []);
    setViewMembers(groupId);
  };

  return (
    <Box>
      <Box sx={{ display: "flex", justifyContent: "space-between", mb: 2 }}>
        <Typography variant="h6">Grupos guardados</Typography>
        <Button variant="contained" startIcon={<AddIcon />} onClick={() => setDialogOpen(true)}>
          Crear grupo
        </Button>
      </Box>

      {result && <Alert severity={result.severity} sx={{ mb: 2 }} onClose={() => setResult(null)}>{result.text}</Alert>}

      {loading ? <CircularProgress /> : groups.length === 0 ? (
        <Paper sx={{ p: 4, textAlign: "center" }}>
          <Typography color="text.secondary">No hay grupos creados. Crea uno o pedile a FAPY que te arme uno.</Typography>
        </Paper>
      ) : (
        <Grid container spacing={2}>
          {groups.map(g => (
            <Grid item xs={12} sm={6} md={4} key={g.id}>
              <Paper sx={{ p: 2, borderRadius: 2, height: "100%" }}>
                <Typography fontWeight={600}>{g.name}</Typography>
                {g.description && <Typography variant="body2" color="text.secondary">{g.description}</Typography>}
                <Box sx={{ mt: 1, display: "flex", gap: 0.5, flexWrap: "wrap" }}>
                  {g.filters?.rubro && <Chip label={g.filters.rubro} size="small" color="primary" variant="outlined" />}
                  {g.filters?.keyword && <Chip label={g.filters.keyword} size="small" variant="outlined" />}
                  <Chip label={`${g.member_count || 0} miembros`} size="small" />
                </Box>
                <Box sx={{ mt: 1.5, display: "flex", gap: 0.5 }}>
                  <Tooltip title="Ver miembros">
                    <IconButton size="small" onClick={() => handleViewMembers(g.id)}><VisibilityIcon fontSize="small" /></IconButton>
                  </Tooltip>
                  <Tooltip title="Eliminar">
                    <IconButton size="small" color="error" onClick={() => handleDelete(g.id)}><DeleteIcon fontSize="small" /></IconButton>
                  </Tooltip>
                </Box>
              </Paper>
            </Grid>
          ))}
        </Grid>
      )}

      {/* Create dialog */}
      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Crear grupo</DialogTitle>
        <DialogContent>
          <Box sx={{ display: "flex", flexDirection: "column", gap: 2, mt: 1 }}>
            <TextField label="Nombre del grupo" placeholder="ej: Mozos Mendoza" required
              value={newGroup.name} onChange={e => setNewGroup(g => ({ ...g, name: e.target.value }))} />
            <TextField label="Descripcion (opcional)"
              value={newGroup.description} onChange={e => setNewGroup(g => ({ ...g, description: e.target.value }))} />
            <Divider />
            <Typography variant="subtitle2" color="text.secondary">Filtros (opcionales — deja vacio para agregar manualmente despues)</Typography>
            <TextField label="Rubro" placeholder="ej: Gastronomia"
              value={newGroup.rubro} onChange={e => setNewGroup(g => ({ ...g, rubro: e.target.value }))} />
            <TextField label="Palabra clave" placeholder="ej: mozo, seguridad..."
              value={newGroup.keyword} onChange={e => setNewGroup(g => ({ ...g, keyword: e.target.value }))} />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialogOpen(false)}>Cancelar</Button>
          <Button variant="contained" onClick={handleCreate} disabled={!newGroup.name}>Crear</Button>
        </DialogActions>
      </Dialog>

      {/* View members dialog */}
      <Dialog open={!!viewMembers} onClose={() => setViewMembers(null)} maxWidth="md" fullWidth>
        <DialogTitle>Miembros del grupo</DialogTitle>
        <DialogContent>
          {members.length === 0 ? (
            <Typography color="text.secondary">Sin miembros</Typography>
          ) : (
            <TableContainer sx={{ maxHeight: 400 }}>
              <Table size="small" stickyHeader>
                <TableHead><TableRow>
                  <TableCell>Nombre</TableCell><TableCell>Email</TableCell><TableCell>Rubro</TableCell>
                </TableRow></TableHead>
                <TableBody>
                  {members.map(m => (
                    <TableRow key={m.id}>
                      <TableCell>{m.name}</TableCell>
                      <TableCell>{m.email}</TableCell>
                      <TableCell><Chip label={m.rubro || "General"} size="small" variant="outlined" /></TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </DialogContent>
        <DialogActions><Button onClick={() => setViewMembers(null)}>Cerrar</Button></DialogActions>
      </Dialog>
    </Box>
  );
}

// ═══════════ TAB 3: Enviar ═══════════
function SendTab({ headers }) {
  const [groups, setGroups] = useState([]);
  const [selectedGroup, setSelectedGroup] = useState("");
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState(null);
  const [preview, setPreview] = useState(null);

  useEffect(() => {
    fetch(`${API_URL}/api/mailing/groups`, { headers }).then(r => r.json()).then(setGroups).catch(() => {});
  }, []);

  const handlePreview = async () => {
    if (!selectedGroup) return;
    const res = await fetch(`${API_URL}/api/mailing/groups/${selectedGroup}/members`, { headers });
    const data = await res.json();
    setPreview(data);
  };

  const handleSend = async () => {
    setSending(true); setResult(null);
    try {
      const res = await fetch(`${API_URL}/api/mailing/send`, {
        method: "POST", headers,
        body: JSON.stringify({ subject, body, group_id: Number(selectedGroup) }),
      });
      const data = await res.json();
      if (res.ok) {
        setResult({ severity: "success", text: data.message });
      } else {
        setResult({ severity: "error", text: data.detail || "Error al enviar" });
      }
    } catch { setResult({ severity: "error", text: "Error de conexion" }); }
    finally { setSending(false); }
  };

  return (
    <Box>
      <Paper sx={{ p: 3, mb: 3, borderRadius: 2 }}>
        <Typography variant="h6" sx={{ mb: 2 }}>
          <GroupIcon sx={{ mr: 1, verticalAlign: "middle" }} /> Destinatarios
        </Typography>
        <Grid container spacing={2} alignItems="center">
          <Grid item xs={12} sm={6}>
            <FormControl fullWidth size="small">
              <InputLabel>Grupo</InputLabel>
              <Select value={selectedGroup} label="Grupo" onChange={e => { setSelectedGroup(e.target.value); setPreview(null); }}>
                <MenuItem value="">Seleccionar grupo...</MenuItem>
                {groups.map(g => (
                  <MenuItem key={g.id} value={g.id}>{g.name} ({g.member_count || 0})</MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} sm={3}>
            <Button variant="outlined" startIcon={<PreviewIcon />} onClick={handlePreview} disabled={!selectedGroup} fullWidth>
              Ver miembros
            </Button>
          </Grid>
          <Grid item xs={12} sm={3}>
            <Typography variant="body2" color="text.secondary">
              {preview ? `${preview.count} destinatarios` : "Selecciona un grupo"}
            </Typography>
          </Grid>
        </Grid>

        {preview && preview.members && preview.members.length > 0 && (
          <Box sx={{ mt: 2, maxHeight: 150, overflow: "auto" }}>
            {preview.members.slice(0, 20).map(m => (
              <Chip key={m.id} label={`${m.name || m.email} (${m.rubro || "General"})`} size="small" sx={{ mr: 0.5, mb: 0.5 }} />
            ))}
            {preview.count > 20 && <Chip label={`+${preview.count - 20} mas`} size="small" variant="outlined" />}
          </Box>
        )}
      </Paper>

      <Paper sx={{ p: 3, mb: 3, borderRadius: 2 }}>
        <Typography variant="h6" sx={{ mb: 2 }}>
          <SendIcon sx={{ mr: 1, verticalAlign: "middle" }} /> Contenido
        </Typography>
        <TextField fullWidth label="Asunto" value={subject} onChange={e => setSubject(e.target.value)} sx={{ mb: 2 }} />
        <TextField fullWidth multiline rows={6} label="Cuerpo (HTML)" placeholder="Hola {nombre}, ..."
          value={body} onChange={e => setBody(e.target.value)} />
        <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: "block" }}>
          Usa {"{nombre}"} para personalizar con el nombre de cada destinatario.
        </Typography>
      </Paper>

      <Box sx={{ display: "flex", gap: 2, justifyContent: "flex-end" }}>
        <Button variant="contained" size="large"
          startIcon={sending ? <CircularProgress size={20} color="inherit" /> : <SendIcon />}
          onClick={handleSend}
          disabled={!subject || !body || !selectedGroup || sending}>
          Enviar a {preview?.count || 0} destinatarios
        </Button>
      </Box>

      {result && <Alert severity={result.severity} sx={{ mt: 2 }}>{result.text}</Alert>}
    </Box>
  );
}
