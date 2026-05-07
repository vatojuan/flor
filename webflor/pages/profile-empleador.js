// pages/profile-empleador.js
import { useState, useEffect } from "react";
import { useRouter } from "next/router";
import Link from "next/link";
import axios from "axios";
import { useSession, signOut } from "next-auth/react";
import DashboardLayout from "../components/DashboardLayout";
import ProfileImage from "../components/ProfileImage";
import ConfirmDialog from "../components/ui/ConfirmDialog";
import useSnackbar from "../hooks/useSnackbar";
import {
  Box,
  Paper,
  TextField,
  Typography,
  Divider,
  Snackbar,
  Alert,
  Button,
  IconButton,
  LinearProgress,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
} from "@mui/material";
import DeleteIcon from "@mui/icons-material/Delete";
import BusinessIcon from "@mui/icons-material/Business";
import DescriptionIcon from "@mui/icons-material/Description";

export default function ProfileEmpleador() {
  const { data: session, status, update } = useSession();
  const router = useRouter();
  const { snackbar, showSnackbar, closeSnackbar } = useSnackbar();

  // Profile state
  const [name, setName] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [description, setDescription] = useState("");
  const [phone, setPhone] = useState("");
  const [loading, setLoading] = useState(false);

  // Profile image state
  const [profileImageUrl, setProfileImageUrl] = useState(
    "/images/default-user.png"
  );
  const [selectedProfileImage, setSelectedProfileImage] = useState(null);
  const [profileImageMessage, setProfileImageMessage] = useState("");

  // Documents state
  const [selectedDocument, setSelectedDocument] = useState(null);
  const [uploadMessage, setUploadMessage] = useState("");
  const [documents, setDocuments] = useState([]);
  const [uploading, setUploading] = useState(false);

  // Delete dialogs
  const [openDocDeleteDialog, setOpenDocDeleteDialog] = useState(false);
  const [selectedDocId, setSelectedDocId] = useState(null);
  const [openDeleteDialog, setOpenDeleteDialog] = useState(false);

  // File restrictions
  const MAX_FILE_SIZE_MB = 5;
  const MAX_FILES = 5;

  // Renew image URL on error
  const handleImageError = async () => {
    try {
      const res = await axios.get("/api/employer/renew-profile-picture");
      if (res.data?.url) {
        setProfileImageUrl(res.data.url);
      }
    } catch {
      // silently ignore renewal failure
    }
  };

  // Load profile
  useEffect(() => {
    if (session) {
      axios
        .get("/api/employer/profile")
        .then((res) => {
          const data = res.data;
          setName(data.name || "");
          setCompanyName(data.companyName || "");
          setDescription(data.description || "");
          setPhone(data.phone || "");
          if (data.profilePicture) {
            setProfileImageUrl(data.profilePicture);
          }
        })
        .catch(() => {});
    }
  }, [session]);

  // Load documents
  useEffect(() => {
    if (session) {
      axios
        .get("/api/employer/documents")
        .then((res) => {
          setDocuments(res.data.documents);
        })
        .catch(() => {});
    }
  }, [session]);

  // Redirect if not logged in
  useEffect(() => {
    if (status !== "loading" && !session) {
      router.push("/login");
    }
  }, [session, status, router]);

  const handleProfileUpdate = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await axios.put("/api/employer/profile", {
        name,
        companyName,
        description,
        phone,
      });
      await update();
      showSnackbar("Perfil actualizado exitosamente", "success");
    } catch {
      showSnackbar("Error actualizando el perfil", "error");
    } finally {
      setLoading(false);
    }
  };

  const handleProfileImageUpload = async (file) => {
    const imageFile = file || selectedProfileImage;
    if (!imageFile) {
      setProfileImageMessage("Por favor, selecciona una imagen.");
      return;
    }
    const formData = new FormData();
    formData.append("profilePicture", imageFile);
    try {
      const res = await axios.post(
        "/api/employer/upload-profile-picture",
        formData,
        { headers: { "Content-Type": "multipart/form-data" } }
      );
      await update();
      setProfileImageUrl(res.data.user.profilePicture);
      showSnackbar("Imagen actualizada", "success");
    } catch {
      showSnackbar("Error actualizando imagen", "error");
    }
  };

  const handleDocumentFileChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (documents.length >= MAX_FILES) {
      showSnackbar(`Solo se permiten ${MAX_FILES} documentos.`, "error");
      return;
    }

    const fileSizeMB = file.size / (1024 * 1024);
    if (fileSizeMB > MAX_FILE_SIZE_MB) {
      showSnackbar(
        `El archivo es demasiado grande. Maximo permitido: ${MAX_FILE_SIZE_MB} MB.`,
        "error"
      );
      return;
    }

    setSelectedDocument(file);
    setUploading(true);
    const formData = new FormData();
    formData.append("document", file);
    if (session?.user?.id) {
      formData.append("userId", session.user.id);
    }
    try {
      await axios.post("/api/employer/upload-document", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      setUploadMessage("Documento subido correctamente.");
      showSnackbar("Documento subido", "success");
      const updatedDocs = await axios.get("/api/employer/documents");
      setDocuments(updatedDocs.data.documents);
    } catch {
      setUploadMessage("Error al subir el documento.");
      showSnackbar("Error subiendo documento", "error");
    } finally {
      setUploading(false);
    }
  };

  const handleRequestDeleteDocument = (documentId) => {
    setSelectedDocId(documentId);
    setOpenDocDeleteDialog(true);
  };

  const confirmDeleteDocument = async () => {
    try {
      await axios.delete("/api/employer/delete-document", {
        data: { documentId: selectedDocId },
      });
      const updatedDocs = await axios.get("/api/employer/documents");
      setDocuments(updatedDocs.data.documents);
      showSnackbar("Documento eliminado correctamente", "success");
    } catch {
      showSnackbar("Error al eliminar el documento", "error");
    } finally {
      setOpenDocDeleteDialog(false);
      setSelectedDocId(null);
    }
  };

  const cancelDeleteDocument = () => {
    setOpenDocDeleteDialog(false);
    setSelectedDocId(null);
  };

  const handleDeleteAccount = () => {
    setOpenDeleteDialog(true);
  };

  const confirmDeleteAccount = async () => {
    try {
      const res = await axios.delete("/api/user/delete");
      if (res.status === 200) {
        showSnackbar("Cuenta eliminada correctamente", "success");
        await signOut({ redirect: false });
        router.push("/login");
      }
    } catch {
      showSnackbar("Error al eliminar la cuenta", "error");
    } finally {
      setOpenDeleteDialog(false);
    }
  };

  const handleDocumentClick = async (doc) => {
    try {
      const res = await axios.get(
        `/api/employer/get-signed-url?fileName=${encodeURIComponent(
          doc.fileKey
        )}`
      );
      if (!res.data || !res.data.url) {
        throw new Error("Error al obtener la URL firmada");
      }
      window.open(res.data.url, "_blank");
    } catch {
      showSnackbar("Error al descargar el documento", "error");
    }
  };

  return (
    <DashboardLayout userRole={session?.user?.role || "empleador"}>
      <Box sx={{ maxWidth: 560, mx: "auto", mt: 4, px: 2 }}>
        <Typography variant="h4" gutterBottom sx={{ textAlign: "center" }}>
          Perfil de Empleador
        </Typography>

        {/* ── Profile Section ── */}
        <Paper sx={{ p: 3, mb: 3 }}>
          <Box sx={{ display: "flex", justifyContent: "center", mb: 2 }}>
            <ProfileImage
              currentImage={profileImageUrl}
              onImageSelected={(file) => handleProfileImageUpload(file)}
              onError={handleImageError}
            />
          </Box>

          {companyName && (
            <Box
              sx={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 1,
                mb: 2,
              }}
            >
              <BusinessIcon sx={{ color: "primary.main" }} />
              <Typography variant="h6" color="primary.main">
                {companyName}
              </Typography>
            </Box>
          )}

          <Divider sx={{ mb: 2 }} />

          <Box component="form" onSubmit={handleProfileUpdate} noValidate>
            <TextField
              label="Nombre"
              fullWidth
              margin="normal"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
            <TextField
              label="Nombre de la Empresa"
              fullWidth
              margin="normal"
              value={companyName}
              onChange={(e) => setCompanyName(e.target.value)}
              required
            />
            <TextField
              label="Descripcion"
              fullWidth
              margin="normal"
              multiline
              rows={4}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              required
            />
            <TextField
              label="Telefono"
              fullWidth
              margin="normal"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              required
            />
            <Button
              type="submit"
              variant="contained"
              color="primary"
              disabled={loading}
              fullWidth
              sx={{ mt: 2 }}
            >
              {loading ? "Actualizando..." : "Actualizar Perfil"}
            </Button>
          </Box>
        </Paper>

        {/* ── Documents Section ── */}
        <Paper sx={{ p: 3, mb: 3 }}>
          <Typography variant="h6" gutterBottom>
            Documentos
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Se permiten hasta {MAX_FILES} documentos. Tamano maximo de cada
            archivo: {MAX_FILE_SIZE_MB} MB.
          </Typography>

          <Button variant="contained" component="label">
            Seleccionar Archivo
            <input
              type="file"
              hidden
              onChange={handleDocumentFileChange}
              accept=".pdf,.doc,.docx,.jpg,.png"
            />
          </Button>

          {uploading && <LinearProgress sx={{ mt: 2 }} />}
          {uploadMessage && (
            <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
              {uploadMessage}
            </Typography>
          )}

          <Divider sx={{ my: 2 }} />

          {documents.length === 0 ? (
            <Typography variant="body2" color="text.secondary">
              No hay documentos subidos.
            </Typography>
          ) : (
            <List disablePadding>
              {documents.map((doc) => (
                <ListItem
                  key={doc.id}
                  disableGutters
                  button
                  onClick={() => handleDocumentClick(doc)}
                  sx={{
                    borderRadius: 1,
                    mb: 0.5,
                    px: 1,
                    "&:hover": {
                      bgcolor: (theme) =>
                        theme.palette.action.hover,
                    },
                  }}
                  secondaryAction={
                    <IconButton
                      edge="end"
                      color="error"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleRequestDeleteDocument(doc.id);
                      }}
                    >
                      <DeleteIcon />
                    </IconButton>
                  }
                >
                  <DescriptionIcon
                    sx={{ color: "primary.main", mr: 1.5, fontSize: 20 }}
                  />
                  <ListItemText
                    primary={doc.originalName || "Documento"}
                    primaryTypographyProps={{
                      color: "primary.main",
                      sx: { cursor: "pointer" },
                    }}
                  />
                </ListItem>
              ))}
            </List>
          )}
        </Paper>

        {/* ── Navigation ── */}
        <Box sx={{ textAlign: "center", mb: 3 }}>
          <Link href="/dashboard" style={{ textDecoration: "none" }}>
            <Button variant="contained" color="primary">
              Volver al Dashboard
            </Button>
          </Link>
        </Box>

        {/* ── Account Deletion Section ── */}
        <Paper
          sx={{
            p: 3,
            mb: 4,
            borderTop: (theme) =>
              `2px solid ${theme.palette.error.main}`,
          }}
        >
          <Typography variant="subtitle1" gutterBottom color="error">
            Zona peligrosa
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Eliminar tu cuenta es irreversible. Se borran todos tus datos.
          </Typography>
          <Box sx={{ display: "flex", justifyContent: "flex-end" }}>
            <Button
              onClick={handleDeleteAccount}
              variant="contained"
              color="warning"
            >
              Eliminar Cuenta
            </Button>
          </Box>
        </Paper>
      </Box>

      {/* ── Confirm Dialogs ── */}
      <ConfirmDialog
        open={openDocDeleteDialog}
        title="Confirmar Eliminacion de Documento"
        message="Estas seguro de que deseas eliminar este documento?"
        onConfirm={confirmDeleteDocument}
        onCancel={cancelDeleteDocument}
        confirmText="Eliminar"
        cancelText="Cancelar"
        severity="warning"
      />

      <ConfirmDialog
        open={openDeleteDialog}
        title="Confirmar Eliminacion de Cuenta"
        message="Estas seguro de que deseas eliminar tu cuenta? Esta accion no se puede deshacer."
        onConfirm={confirmDeleteAccount}
        onCancel={() => setOpenDeleteDialog(false)}
        confirmText="Eliminar"
        cancelText="Cancelar"
        severity="error"
      />

      <Snackbar
        open={snackbar.open}
        autoHideDuration={4000}
        onClose={closeSnackbar}
        anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
      >
        <Alert
          onClose={closeSnackbar}
          severity={snackbar.severity}
          variant="filled"
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </DashboardLayout>
  );
}
