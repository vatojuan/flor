import React, { useState, useEffect, useRef } from "react";
import {
  Container, Typography, Table, TableHead, TableBody, TableRow, TableCell,
  TableContainer, Paper, Button, Dialog, DialogTitle, DialogContent,
  DialogActions, TextField, Select, MenuItem, InputLabel, FormControl,
  Box, Snackbar, Alert, Chip, Stack, Checkbox, FormControlLabel, Tooltip
} from "@mui/material";
import StarIcon from '@mui/icons-material/Star';
import DashboardLayout from "../../components/DashboardLayout";
import useAdminAuth from "../../hooks/useAdminAuth";

const API = process.env.NEXT_PUBLIC_API_URL;

// Placeholders agrupados por contexto para mayor claridad
const PLACEHOLDER_GROUPS = [
    {
        group: "Datos del Candidato",
        placeholders: [
            { label: "Nombre Candidato", code: "{{applicant_name}}" },
            { label: "Email Candidato", code: "{{applicant_email}}" },
        ]
    },
    {
        group: "Datos de la Oferta",
        placeholders: [
            { label: "Título de la Oferta", code: "{{job_title}}" },
            { label: "Link para Postular", code: "{{apply_link}}" },
            { label: "Puntaje de Match", code: "{{score}}" },
        ]
    },
    {
        group: "Datos del Empleador",
        placeholders: [
            { label: "Nombre Empleador", code: "{{employer_name}}" },
            { label: "Link a CV", code: "{{cv_url}}" },
        ]
    }
];

// Mapeo de tipos de plantilla para la UI
const TEMPLATE_TYPES = {
    "empleado": "Match (a Candidato)",
    "automatic": "Propuesta Automática (a Empleador)",
    "manual": "Propuesta Manual (a Empleador)",
    "application_confirmation": "Confirmación de Postulación (a Candidato)",
    "cancellation_warning": "Aviso de Cancelación (a Candidato)",
};

export default function TemplatesPage({ toggleDarkMode, currentMode }) {
  const { user, loading } = useAdminAuth();
  const [templates, setTemplates] = useState([]);
  const [openDialog, setOpenDialog] = useState(false);
  const [editing, setEditing] = useState(null);
  const [snackbar, setSnackbar] = useState({ open: false, message: "", severity: "success" });

  const formRef = useRef({ name: "", type: "empleado", subject: "", body: "", is_default: false });

  // --- CORRECCIÓN CLAVE ---
  // Implementamos la función fetchTemplates para que llame al endpoint correcto.
  const fetchTemplates = async () => {
    try {
      const res = await fetch(`${API}/api/admin/templates`, { // <-- URL CORRECTA
        headers: { Authorization: `Bearer ${localStorage.getItem("adminToken")}` }
      });
      if (!res.ok) {
        throw new Error(`Error del servidor: ${res.status}`);
      }
      const data = await res.json();
      setTemplates(data.templates || []);
    } catch (error) {
      console.error("Error cargando plantillas:", error);
      setSnackbar({ open: true, message: "Error cargando las plantillas", severity: "error" });
    }
  };

  useEffect(() => {
    if (!loading && user) {
      fetchTemplates();
    }
  }, [loading, user]);

  const handleOpenNew = () => {
    setEditing(null);
    formRef.current = { name: "", type: "empleado", subject: "", body: "", is_default: false };
    setOpenDialog(true);
  };

  const handleOpenEdit = (tpl) => {
    setEditing(tpl);
    // Usamos una copia para evitar mutaciones directas del estado
    formRef.current = { ...tpl };
    setOpenDialog(true);
  };

  const insertPlaceholder = (code) => {
    const ta = document.getElementById("template-body-field");
    if (!ta) return;
    const pos = ta.selectionStart;
    const newBody = ta.value.slice(0, pos) + code + ta.value.slice(pos);
    
    // Actualizamos el ref y forzamos un re-render para que la UI lo refleje
    formRef.current.body = newBody;
    setEditing(prev => ({...prev}));
  };

  const handleSave = async () => {
    const payload = {
        name: formRef.current.name.trim(),
        type: formRef.current.type,
        subject: formRef.current.subject.trim(),
        body: formRef.current.body,
        is_default: formRef.current.is_default,
    };
    const url = editing ? `${API}/api/admin/templates/${editing.id}` : `${API}/api/admin/templates`;
    const method = editing ? "PUT" : "POST";

    try {
        const res = await fetch(url, {
            method,
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${localStorage.getItem("adminToken")}`
            },
            body: JSON.stringify(payload)
        });
        if (!res.ok) throw new Error("La petición al servidor falló.");
        setSnackbar({ open: true, message: "Plantilla guardada con éxito", severity: "success" });
        setOpenDialog(false);
        fetchTemplates(); // Volver a cargar las plantillas
    } catch (error) {
        console.error("Error al guardar:", error);
        setSnackbar({ open: true, message: "Error al guardar la plantilla", severity: "error" });
    }
  };
  
  const handleDelete = async (tpl) => {
    if (!window.confirm(`¿Estás seguro de que quieres eliminar la plantilla "${tpl.name}"?`)) return;
    try {
        const res = await fetch(`${API}/api/admin/templates/${tpl.id}`, {
            method: "DELETE",
            headers: { Authorization: `Bearer ${localStorage.getItem("adminToken")}` }
        });
        if (!res.ok) throw new Error("La petición al servidor falló.");
        setSnackbar({ open: true, message: "Plantilla eliminada", severity: "success" });
        fetchTemplates();
    } catch (error) {
        console.error("Error al eliminar:", error);
        setSnackbar({ open: true, message: "Error al eliminar la plantilla", severity: "error" });
    }
  };

  const handleSetDefault = async (tpl) => {
    try {
        const res = await fetch(`${API}/api/admin/templates/${tpl.id}/set-default`, {
            method: "POST",
            headers: { Authorization: `Bearer ${localStorage.getItem("adminToken")}` }
        });
        if (!res.ok) throw new Error("La petición al servidor falló.");
        setSnackbar({ open: true, message: "Plantilla predeterminada actualizada", severity: "success" });
        fetchTemplates();
    } catch (error) {
        console.error("Error al marcar como predeterminada:", error);
        setSnackbar({ open: true, message: "Error al actualizar la plantilla predeterminada", severity: "error" });
    }
  };

  if (loading || !user) return <p>Cargando...</p>;

  return (
    <DashboardLayout toggleDarkMode={toggleDarkMode} currentMode={currentMode}>
      <Container sx={{ mt: 4, mb: 4 }}>
        <Typography variant="h4" gutterBottom>Gestión de Plantillas de Email</Typography>
        <Button variant="contained" onClick={handleOpenNew} sx={{ mb: 2 }}>Nueva Plantilla</Button>
        <TableContainer component={Paper}>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Nombre</TableCell>
                <TableCell>Tipo de Notificación</TableCell>
                <TableCell>Asunto</TableCell>
                <TableCell align="center">Predeterminada</TableCell>
                <TableCell>Acciones</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {templates.map(tpl => (
                <TableRow key={tpl.id} hover>
                  <TableCell>{tpl.name}</TableCell>
                  <TableCell>{TEMPLATE_TYPES[tpl.type] || tpl.type}</TableCell>
                  <TableCell>{tpl.subject}</TableCell>
                  <TableCell align="center">
                    {tpl.is_default ? 
                      <Tooltip title="Predeterminada para este tipo">
                        <StarIcon color="primary" />
                      </Tooltip> :
                      <Button size="small" onClick={() => handleSetDefault(tpl)}>Marcar</Button>
                    }
                  </TableCell>
                  <TableCell>
                    <Button size="small" onClick={() => handleOpenEdit(tpl)}>Editar</Button>
                    <Button size="small" color="error" onClick={() => handleDelete(tpl)}>Borrar</Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </Container>

      <Dialog open={openDialog} onClose={() => setOpenDialog(false)} fullWidth maxWidth="md">
        <DialogTitle>{editing ? "Editar" : "Nueva"} Plantilla</DialogTitle>
        <DialogContent>
          <Box component="form" sx={{ display: "flex", flexDirection: "column", gap: 2, mt: 1 }}>
            <TextField label="Nombre de la Plantilla" defaultValue={formRef.current.name} onChange={e => formRef.current.name = e.target.value} fullWidth />
            <FormControl fullWidth>
              <InputLabel>Tipo de Notificación</InputLabel>
              <Select label="Tipo de Notificación" defaultValue={formRef.current.type} onChange={e => formRef.current.type = e.target.value}>
                {Object.entries(TEMPLATE_TYPES).map(([key, value]) => (
                  <MenuItem key={key} value={key}>{value}</MenuItem>
                ))}
              </Select>
            </FormControl>
            <TextField label="Asunto del Email" defaultValue={formRef.current.subject} onChange={e => formRef.current.subject = e.target.value} fullWidth />
            <FormControlLabel
              control={<Checkbox defaultChecked={formRef.current.is_default} onChange={e => formRef.current.is_default = e.target.checked} />}
              label="Usar como predeterminada para este tipo de notificación"
            />
            
            {PLACEHOLDER_GROUPS.map(group => (
                <Box key={group.group} sx={{ border: '1px solid #ccc', borderRadius: 1, p: 1, mb: 1 }}>
                    <Typography variant="caption" display="block" gutterBottom>{group.group}</Typography>
                    <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap">
                        {group.placeholders.map(ph => (
                            <Chip key={ph.code} label={ph.label} size="small" variant="outlined" onClick={() => insertPlaceholder(ph.code)} />
                        ))}
                    </Stack>
                </Box>
            ))}

            <TextField
              id="template-body-field"
              label="Cuerpo del Email (HTML permitido)"
              value={formRef.current.body || ''}
              onChange={e => {
                  formRef.current.body = e.target.value;
                  setEditing(prev => ({...prev}));
              }}
              multiline rows={12} fullWidth
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenDialog(false)}>Cancelar</Button>
          <Button variant="contained" onClick={handleSave}>{editing ? "Guardar Cambios" : "Crear Plantilla"}</Button>
        </DialogActions>
      </Dialog>
      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={() => setSnackbar(prev => ({ ...prev, open: false }))}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert onClose={() => setSnackbar(prev => ({ ...prev, open: false }))} severity={snackbar.severity} sx={{ width: '100%' }}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </DashboardLayout>
  );
}

