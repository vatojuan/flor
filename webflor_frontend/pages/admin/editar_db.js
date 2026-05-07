// pages/admin/editar_db.js
import React, { useState, useEffect, useCallback } from "react";
import {
  Container,
  TextField,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  IconButton,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  DialogContentText,
  Snackbar,
  Alert,
  Typography,
  Box,
  CircularProgress,
  Chip,
  Grid,
  InputAdornment,
} from "@mui/material";
import EditIcon from "@mui/icons-material/Edit";
import DeleteIcon from "@mui/icons-material/Delete";
import CloudUploadIcon from "@mui/icons-material/CloudUpload";
import DownloadIcon from "@mui/icons-material/Download";
import SearchIcon from "@mui/icons-material/Search";
import DashboardLayout from "../../components/DashboardLayout";
import useAdminAuth from "../../hooks/useAdminAuth";

export default function EditarDB() {
  const { user, loading } = useAdminAuth();
  const [usersList, setUsersList] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [filteredUsers, setFilteredUsers] = useState([]);
  const [selectedUser, setSelectedUser] = useState(null);
  const [openEditDialog, setOpenEditDialog] = useState(false);
  const [editedName, setEditedName] = useState("");
  const [editedPhone, setEditedPhone] = useState("");
  const [editedDescription, setEditedDescription] = useState("");
  const [editedFiles, setEditedFiles] = useState([]);
  const [newFile, setNewFile] = useState(null);
  const [snackbar, setSnackbar] = useState({ open: false, message: "", severity: "success" });

  // Delete confirmation dialog state
  const [deleteDialog, setDeleteDialog] = useState({ open: false, userId: null, userName: "" });
  // File delete confirmation dialog state
  const [fileDeleteDialog, setFileDeleteDialog] = useState({ open: false, fileId: null, fileName: "" });

  const getToken = () => typeof window !== "undefined" ? localStorage.getItem("adminToken") : null;

  const fetchUsers = useCallback(async () => {
    const token = getToken();
    if (!token) return;
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/admin/users`, {
        headers: { "Authorization": `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setUsersList(data.users);
        setFilteredUsers(data.users);
      } else {
        setSnackbar({ open: true, message: "Error al cargar usuarios", severity: "error" });
      }
    } catch (error) {
      setSnackbar({ open: true, message: "Error de red al cargar usuarios", severity: "error" });
    }
  }, []);

  useEffect(() => {
    if (!loading) {
      fetchUsers();
    }
  }, [loading, fetchUsers]);

  useEffect(() => {
    const results = usersList.filter(u =>
      (u.name && u.name.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (u.email && u.email.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (u.phone && u.phone.toLowerCase().includes(searchTerm.toLowerCase()))
    );
    setFilteredUsers(results);
  }, [searchTerm, usersList]);

  const handleEditClick = (userItem) => {
    setSelectedUser(userItem);
    setEditedName(userItem.name || "");
    setEditedPhone(userItem.phone || "");
    setEditedDescription(userItem.description || "");
    setEditedFiles(userItem.files || []);
    setOpenEditDialog(true);
  };

  const handleDialogClose = () => {
    setSelectedUser(null);
    setOpenEditDialog(false);
    setNewFile(null);
  };

  const handleApiCall = async (endpoint, options = {}) => {
    const token = getToken();
    if (!token) {
      setSnackbar({ open: true, message: "Token de administrador no encontrado.", severity: "error" });
      return null;
    }
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}${endpoint}`, {
        ...options,
        headers: {
          ...options.headers,
          "Authorization": `Bearer ${token}`
        }
      });
      return res;
    } catch (error) {
      setSnackbar({ open: true, message: "Error de red al contactar la API.", severity: "error" });
      return null;
    }
  };

  const handleUpdateUser = async () => {
    if (!selectedUser) return;
    const res = await handleApiCall(`/admin/users/${selectedUser.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: editedName, phone: editedPhone, description: editedDescription })
    });
    if (res && res.ok) {
      setSnackbar({ open: true, message: "Usuario actualizado", severity: "success" });
      fetchUsers();
      handleDialogClose();
    } else if (res) {
      const errorData = await res.json().catch(() => ({ detail: `Error al actualizar: ${res.statusText}` }));
      setSnackbar({ open: true, message: errorData.detail, severity: "error" });
    }
  };

  const handleDeleteUser = async (userId) => {
    const res = await handleApiCall(`/admin/users/${userId}`, { method: "DELETE" });
    if (res && res.ok) {
      setSnackbar({ open: true, message: "Usuario eliminado", severity: "success" });
      fetchUsers();
    } else if (res) {
      const errorData = await res.json().catch(() => ({ detail: `Error al eliminar: ${res.statusText}` }));
      setSnackbar({ open: true, message: errorData.detail, severity: "error" });
    }
  };

  const handleNewFileChange = (e) => {
    if (e.target.files.length > 0) setNewFile(e.target.files[0]);
  };

  const handleUploadFile = async () => {
    if (!newFile || !selectedUser) return;
    const formData = new FormData();
    formData.append("file", newFile);
    const res = await handleApiCall(`/admin/users/${selectedUser.id}/files`, {
      method: "POST",
      body: formData
    });
    if (res && res.ok) {
      const updatedUser = await res.json();
      setEditedFiles(updatedUser.files);
      setNewFile(null);
      setSnackbar({ open: true, message: "Archivo subido", severity: "success" });
    } else if (res) {
      const errorData = await res.json().catch(() => ({ detail: `Error al subir archivo: ${res.statusText}` }));
      setSnackbar({ open: true, message: errorData.detail, severity: "error" });
    }
  };

  const handleDeleteFile = async (fileId) => {
    if (!selectedUser) return;
    const res = await handleApiCall(`/admin/users/${selectedUser.id}/files/${fileId}`, { method: "DELETE" });
    if (res && res.ok) {
      const updatedUser = await res.json();
      setEditedFiles(updatedUser.files);
      setSnackbar({ open: true, message: "Archivo eliminado", severity: "success" });
    } else if (res) {
      const errorData = await res.json().catch(() => ({ detail: `Error al eliminar archivo: ${res.statusText}` }));
      setSnackbar({ open: true, message: errorData.detail, severity: "error" });
    }
  };

  const handleDownloadFile = async (file) => {
    if (!selectedUser) return;
    const endpoint = `/admin/users/files/${file.id}/signed-url`;
    const res = await handleApiCall(endpoint, { method: 'GET' });

    if (res && res.ok) {
      const data = await res.json();
      if (data.url) {
        window.open(data.url, "_blank");
      } else {
        setSnackbar({ open: true, message: "La respuesta del servidor no contiene una URL.", severity: "error" });
      }
    } else if (res) {
      const errorData = await res.json().catch(() => ({ detail: `Error ${res.status}: La ruta de descarga no existe en la API.` }));
      setSnackbar({ open: true, message: errorData.detail, severity: "error" });
    }
  };

  if (loading) {
    return (
      <DashboardLayout>
        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '80vh' }}>
          <CircularProgress />
        </Box>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <Container maxWidth="lg" sx={{ mt: 4 }}>
        <Typography variant="h4" gutterBottom>Editar Base de Datos</Typography>
        <TextField
          label="Buscar cliente"
          variant="outlined"
          fullWidth
          margin="normal"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon color="action" />
              </InputAdornment>
            ),
          }}
        />
        <TableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Nombre</TableCell>
                <TableCell>Email</TableCell>
                <TableCell>Teléfono</TableCell>
                <TableCell>Rubro</TableCell>
                <TableCell align="center">Acciones</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {filteredUsers.length > 0 ? filteredUsers.map((u) => (
                <TableRow key={u.id} hover>
                  <TableCell>{u.name}</TableCell>
                  <TableCell>{u.email}</TableCell>
                  <TableCell>{u.phone}</TableCell>
                  <TableCell>
                    {u.rubro ? (
                      <Chip label={u.rubro} size="small" color="primary" variant="outlined" />
                    ) : (
                      <Typography variant="body2" color="text.secondary">—</Typography>
                    )}
                  </TableCell>
                  <TableCell align="center">
                    <IconButton onClick={() => handleEditClick(u)}><EditIcon color="primary" /></IconButton>
                    <IconButton onClick={() => setDeleteDialog({ open: true, userId: u.id, userName: u.name || u.email })}><DeleteIcon color="error" /></IconButton>
                  </TableCell>
                </TableRow>
              )) : (
                <TableRow>
                  <TableCell colSpan={5} align="center">No se encontraron clientes.</TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </Container>

      {/* Delete confirmation dialog */}
      <Dialog
        open={deleteDialog.open}
        onClose={() => setDeleteDialog({ open: false, userId: null, userName: "" })}
      >
        <DialogTitle>Confirmar eliminación</DialogTitle>
        <DialogContent>
          <DialogContentText>
            ¿Estás seguro de que deseas eliminar a <strong>{deleteDialog.userName}</strong>? Se eliminarán la cuenta, archivos y embeddings. Esta acción no se puede deshacer.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialog({ open: false, userId: null, userName: "" })}>
            Cancelar
          </Button>
          <Button
            color="error"
            variant="contained"
            onClick={() => {
              handleDeleteUser(deleteDialog.userId);
              setDeleteDialog({ open: false, userId: null, userName: "" });
            }}
          >
            Eliminar
          </Button>
        </DialogActions>
      </Dialog>

      {/* File delete confirmation dialog */}
      <Dialog
        open={fileDeleteDialog.open}
        onClose={() => setFileDeleteDialog({ open: false, fileId: null, fileName: "" })}
      >
        <DialogTitle>Confirmar eliminación de archivo</DialogTitle>
        <DialogContent>
          <DialogContentText>
            ¿Seguro que quieres eliminar el archivo <strong>{fileDeleteDialog.fileName}</strong>?
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setFileDeleteDialog({ open: false, fileId: null, fileName: "" })}>
            Cancelar
          </Button>
          <Button
            color="error"
            variant="contained"
            onClick={() => {
              handleDeleteFile(fileDeleteDialog.fileId);
              setFileDeleteDialog({ open: false, fileId: null, fileName: "" });
            }}
          >
            Eliminar
          </Button>
        </DialogActions>
      </Dialog>

      {selectedUser && (
        <Dialog open={openEditDialog} onClose={handleDialogClose} maxWidth="sm" fullWidth>
          <DialogTitle>Editar Usuario: {selectedUser.name}</DialogTitle>
          <DialogContent sx={{ pt: 2 }}>
            <Grid container spacing={2} sx={{ mt: 0.5 }}>
              <Grid item xs={12} sm={6}>
                <TextField label="Nombre" fullWidth value={editedName} onChange={(e) => setEditedName(e.target.value)} />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField label="Teléfono" fullWidth value={editedPhone} onChange={(e) => setEditedPhone(e.target.value)} />
              </Grid>
              <Grid item xs={12}>
                <TextField label="Descripción" fullWidth multiline rows={3} value={editedDescription} onChange={(e) => setEditedDescription(e.target.value)} />
              </Grid>
            </Grid>
            <Box sx={{ mt: 3 }}>
              <Typography variant="subtitle1" sx={{ mb: 1 }}>Archivos Subidos</Typography>
              {editedFiles && editedFiles.length > 0 ? (
                editedFiles.map((file) => (
                  <Box
                    key={file.id}
                    sx={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      my: 1,
                      p: 1,
                      borderRadius: 1,
                      bgcolor: 'action.hover',
                      '&:hover': { bgcolor: 'action.selected' },
                    }}
                  >
                    <Typography variant="body2" sx={{ flexGrow: 1 }}>{file.filename}</Typography>
                    <Box>
                      <IconButton size="small" onClick={() => handleDownloadFile(file)}><DownloadIcon fontSize="small" /></IconButton>
                      <IconButton
                        size="small"
                        onClick={() => setFileDeleteDialog({ open: true, fileId: file.id, fileName: file.filename })}
                      >
                        <DeleteIcon fontSize="small" color="error" />
                      </IconButton>
                    </Box>
                  </Box>
                ))
              ) : (
                <Typography variant="body2" color="text.secondary">No hay archivos subidos.</Typography>
              )}
              <Box sx={{ display: 'flex', alignItems: 'center', mt: 2 }}>
                <Button variant="contained" component="label" startIcon={<CloudUploadIcon />} size="small">
                  Agregar Archivo
                  <input type="file" hidden onChange={handleNewFileChange} />
                </Button>
                {newFile && (<Typography variant="body2" sx={{ ml: 2 }}>{newFile.name}</Typography>)}
                <Button variant="outlined" size="small" sx={{ ml: 2 }} onClick={handleUploadFile} disabled={!newFile}>Subir</Button>
              </Box>
            </Box>
          </DialogContent>
          <DialogActions>
            <Button onClick={handleDialogClose}>Cancelar</Button>
            <Button onClick={handleUpdateUser} variant="contained" color="primary">Guardar Cambios</Button>
          </DialogActions>
        </Dialog>
      )}

      <Snackbar open={snackbar.open} autoHideDuration={4000} onClose={() => setSnackbar({ ...snackbar, open: false })} anchorOrigin={{ vertical: "bottom", horizontal: "center" }}>
        <Alert onClose={() => setSnackbar({ ...snackbar, open: false })} severity={snackbar.severity} variant="filled">{snackbar.message}</Alert>
      </Snackbar>
    </DashboardLayout>
  );
}
