// pages/profile-empleado.js
import { useState, useEffect } from "react";
import { useRouter } from "next/router";
import axios from "axios";
import { useSession, signOut } from "next-auth/react";
import DashboardLayout from "../components/DashboardLayout";
import ProfileImage from "../components/ProfileImage";
import Link from "next/link";
import {
  Box,
  Paper,
  TextField,
  Button,
  Typography,
  Snackbar,
  Alert,
  IconButton,
  LinearProgress,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
} from "@mui/material";
import { alpha, useTheme } from "@mui/material/styles";
import DeleteIcon from "@mui/icons-material/Delete";
import DescriptionOutlinedIcon from "@mui/icons-material/DescriptionOutlined";
import useSnackbar from "../hooks/useSnackbar";
import ConfirmDialog from "../components/ui/ConfirmDialog";

export default function ProfileEmpleado() {
  const { data: session, status, update } = useSession();
  const router = useRouter();
  const theme = useTheme();
  const { snackbar, showSnackbar, closeSnackbar } = useSnackbar();

  // Profile state
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [description, setDescription] = useState("");
  const [loading, setLoading] = useState(false);

  // Profile image state
  const [profileImageUrl, setProfileImageUrl] = useState(
    "/images/default-user.png"
  );

  const handleImageError = async () => {
    try {
      const res = await axios.get("/api/employee/renew-profile-picture");
      if (res.data?.url) {
        setProfileImageUrl(res.data.url);
      }
    } catch (_err) {
      // silent — image will stay at default
    }
  };

  const [selectedProfileImage, setSelectedProfileImage] = useState(null);
  const [profileImageMessage, setProfileImageMessage] = useState("");

  // Document state
  const [selectedDocument, setSelectedDocument] = useState(null);
  const [uploadMessage, setUploadMessage] = useState("");
  const [documents, setDocuments] = useState([]);
  const [uploading, setUploading] = useState(false);

  // Active/searching status
  const [isActive, setIsActive] = useState(true);

  // Confirm-dialog state: document delete
  const [openDocDeleteDialog, setOpenDocDeleteDialog] = useState(false);
  const [selectedDocId, setSelectedDocId] = useState(null);

  // Confirm-dialog state: account delete
  const [openDeleteDialog, setOpenDeleteDialog] = useState(false);

  // --------------- Account delete ---------------
  const toggleActive = async () => {
    try {
      const jwt = session?.accessToken || session?.user?.token;
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || ""}/api/users/toggle-active`, {
        method: "PATCH",
        headers: { Authorization: `Bearer ${jwt}` },
      });
      if (res.ok) {
        const data = await res.json();
        setIsActive(data.active);
        showSnackbar(data.message, "success");
      }
    } catch {
      showSnackbar("Error al cambiar el estado", "error");
    }
  };

  const confirmDeleteAccount = async () => {
    try {
      const res = await axios.delete("/api/user/delete");
      if (res.status === 200) {
        showSnackbar("Cuenta eliminada correctamente", "success");
        await signOut({ redirect: false });
        router.push("/login");
      }
    } catch (_err) {
      showSnackbar("Error al eliminar la cuenta", "error");
    } finally {
      setOpenDeleteDialog(false);
    }
  };

  // --------------- Load profile ---------------
  useEffect(() => {
    if (session) {
      axios
        .get("/api/employee/profile")
        .then(async (res) => {
          const data = res.data;
          setName(data.name || "");
          setPhone(data.phone || "");
          setDescription(data.description || "");
          if (data.profilePicture) {
            setProfileImageUrl(data.profilePicture);
            if (data.profilePicture.includes("X-Goog-Expires")) {
              try {
                const renewRes = await axios.get(
                  "/api/employee/renew-profile-picture"
                );
                if (renewRes.data?.url) {
                  setProfileImageUrl(renewRes.data.url);
                }
              } catch (_err) {
                // silent
              }
            }
          }
        })
        .catch(() => {});
    }
  }, [session]);

  // --------------- Load documents ---------------
  useEffect(() => {
    if (session) {
      axios
        .get("/api/employee/documents")
        .then((res) => setDocuments(res.data.documents))
        .catch(() => {});
    }
  }, [session]);

  // --------------- Auth guard ---------------
  useEffect(() => {
    if (status !== "loading" && !session) {
      router.push("/login");
    }
  }, [session, status, router]);

  // --------------- Profile update ---------------
  const handleProfileUpdate = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await axios.put("/api/employee/profile", { name, phone, description });
      await update();
      showSnackbar("Perfil actualizado exitosamente", "success");
    } catch (_err) {
      showSnackbar("Error actualizando el perfil", "error");
    } finally {
      setLoading(false);
    }
  };

  // --------------- Profile image upload ---------------
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
        "/api/employee/upload-profile-picture",
        formData,
        { headers: { "Content-Type": "multipart/form-data" } }
      );
      await update();
      setProfileImageUrl(res.data.user.profilePicture);
      showSnackbar("Imagen actualizada", "success");
    } catch (_err) {
      setProfileImageMessage("Error al actualizar la imagen de perfil.");
      showSnackbar("Error actualizando imagen", "error");
    }
  };

  // --------------- Document upload ---------------
  const MAX_FILE_SIZE_MB = 5;
  const MAX_FILES = 5;

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
        `El archivo es demasiado grande. Máximo permitido: ${MAX_FILE_SIZE_MB} MB.`,
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
      await axios.post("/api/employee/upload-document", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      setUploadMessage("Documento subido correctamente.");
      showSnackbar("Documento subido", "success");
      const updatedDocs = await axios.get("/api/employee/documents");
      setDocuments(updatedDocs.data.documents);
    } catch (_err) {
      setUploadMessage("Error al subir el documento.");
      showSnackbar("Error subiendo documento", "error");
    } finally {
      setUploading(false);
    }
  };

  // --------------- Document delete ---------------
  const confirmDeleteDocument = async () => {
    try {
      await axios.delete("/api/employee/delete-document", {
        data: { documentId: selectedDocId },
      });
      const updatedDocs = await axios.get("/api/employee/documents");
      setDocuments(updatedDocs.data.documents);
      showSnackbar("Documento eliminado correctamente", "success");
    } catch (_err) {
      showSnackbar("Error al eliminar el documento", "error");
    } finally {
      setOpenDocDeleteDialog(false);
      setSelectedDocId(null);
    }
  };

  // --------------- Document download ---------------
  const handleOpenDocument = async (fileKey) => {
    try {
      const res = await axios.get(
        `/api/employee/get-signed-url?fileName=${encodeURIComponent(fileKey)}`
      );
      if (!res.data?.url) {
        throw new Error("Error al obtener la URL firmada");
      }
      window.open(res.data.url, "_blank");
    } catch (_err) {
      showSnackbar("Error al descargar el documento", "error");
    }
  };

  // --------------- Shared paper style ---------------
  const paperSx = {
    maxWidth: 560,
    mx: "auto",
    p: 3,
    borderRadius: 2,
  };

  return (
    <DashboardLayout userRole={session?.user?.role || "empleado"}>
      <Box sx={{ maxWidth: 600, mx: "auto", mt: 4, mb: 6, px: 2 }}>
        {/* ====== Page title ====== */}
        <Typography variant="h4" gutterBottom sx={{ textAlign: "center" }}>
          Perfil de Empleado
        </Typography>

        {/* ====== SECTION 1 — Profile info ====== */}
        <Paper elevation={1} sx={{ ...paperSx, mb: 3, textAlign: "center" }}>
          <Box sx={{ mb: 2 }}>
            <ProfileImage
              currentImage={profileImageUrl}
              onImageSelected={(file) => handleProfileImageUpload(file)}
              onError={handleImageError}
            />
          </Box>

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
              label="Teléfono"
              fullWidth
              margin="normal"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              required
            />
            <TextField
              label="Descripción"
              fullWidth
              margin="normal"
              multiline
              rows={4}
              value={description}
              onChange={(e) => {
                if (e.target.value.length <= 3000) {
                  setDescription(e.target.value);
                }
              }}
              required
              helperText={`${description.length}/3000 — La descripción se usará para facilitar las búsquedas y matching.`}
              inputProps={{ maxLength: 3000 }}
            />
            <Button
              type="submit"
              variant="contained"
              color="primary"
              disabled={loading}
              sx={{ mt: 2 }}
            >
              {loading ? "Actualizando..." : "Actualizar Perfil"}
            </Button>
          </Box>

          {session?.user?.provider === "credentials" && (
            <Box sx={{ textAlign: "center", mt: 2 }}>
              <Link href="/change-password" style={{ textDecoration: "none" }}>
                <Button variant="outlined" color="primary">
                  Cambiar Contraseña
                </Button>
              </Link>
            </Box>
          )}
        </Paper>

        {/* ====== SECTION 2 — Documents ====== */}
        <Paper elevation={1} sx={{ ...paperSx, mb: 3 }}>
          <Typography variant="h6" gutterBottom>
            Documentos
          </Typography>

          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Sube tu CV u otros archivos de interés. Hasta {MAX_FILES}{" "}
            documentos, {MAX_FILE_SIZE_MB} MB cada uno.
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

          {documents.length === 0 ? (
            <Typography
              variant="body2"
              color="text.secondary"
              sx={{ mt: 2, fontStyle: "italic" }}
            >
              No hay documentos subidos.
            </Typography>
          ) : (
            <List sx={{ mt: 1 }}>
              {documents.map((doc) => (
                <ListItem
                  key={doc.id}
                  button
                  onClick={() => handleOpenDocument(doc.fileKey)}
                  sx={{
                    borderRadius: 1,
                    mb: 0.5,
                    color: "primary.main",
                    "&:hover": {
                      backgroundColor: alpha(
                        theme.palette.primary.main,
                        0.04
                      ),
                    },
                  }}
                >
                  <DescriptionOutlinedIcon
                    sx={{ mr: 1.5, color: "primary.main", fontSize: 20 }}
                  />
                  <ListItemText
                    primary={doc.originalName || "Documento"}
                    primaryTypographyProps={{ noWrap: true }}
                  />
                  <ListItemSecondaryAction>
                    <IconButton
                      edge="end"
                      color="error"
                      onClick={() => {
                        setSelectedDocId(doc.id);
                        setOpenDocDeleteDialog(true);
                      }}
                    >
                      <DeleteIcon />
                    </IconButton>
                  </ListItemSecondaryAction>
                </ListItem>
              ))}
            </List>
          )}
        </Paper>

        {/* ====== Back to dashboard ====== */}
        <Box sx={{ textAlign: "center", mb: 4 }}>
          <Link href="/dashboard" style={{ textDecoration: "none" }}>
            <Button variant="contained" color="primary">
              Volver al Dashboard
            </Button>
          </Link>
        </Box>

        {/* ====== SECTION 3 — Search status toggle ====== */}
        <Paper elevation={0} sx={{ ...paperSx }}>
          <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <Box>
              <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
                Estado de busqueda
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {isActive
                  ? "Tu perfil esta activo — podes recibir ofertas de trabajo por email."
                  : "Tu perfil esta pausado — no recibiras emails de ofertas. Podes reactivarlo en cualquier momento."}
              </Typography>
            </Box>
            <Button
              variant={isActive ? "outlined" : "contained"}
              color={isActive ? "warning" : "success"}
              onClick={toggleActive}
              sx={{ minWidth: 140 }}
            >
              {isActive ? "Pausar perfil" : "Reactivar perfil"}
            </Button>
          </Box>
        </Paper>

        {/* ====== SECTION 4 — Account deletion (danger zone) ====== */}
        <Paper
          elevation={0}
          sx={{
            ...paperSx,
            border: `1px solid ${theme.palette.error.main}`,
            backgroundColor: alpha(theme.palette.error.main, 0.03),
          }}
        >
          <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 1 }}>
            Zona de peligro
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Eliminar tu cuenta es permanente y no se puede deshacer.
          </Typography>
          <Box sx={{ display: "flex", justifyContent: "flex-end" }}>
            <Button
              onClick={() => setOpenDeleteDialog(true)}
              variant="contained"
              color="error"
            >
              Eliminar Cuenta
            </Button>
          </Box>
        </Paper>
      </Box>

      {/* ====== Confirm dialogs ====== */}
      <ConfirmDialog
        open={openDocDeleteDialog}
        title="Eliminar Documento"
        message="¿Estás seguro de que deseas eliminar este documento?"
        onConfirm={confirmDeleteDocument}
        onCancel={() => {
          setOpenDocDeleteDialog(false);
          setSelectedDocId(null);
        }}
        confirmText="Eliminar"
        cancelText="Cancelar"
        severity="warning"
      />

      <ConfirmDialog
        open={openDeleteDialog}
        title="Eliminar Cuenta"
        message="¿Estás seguro de que deseas eliminar tu cuenta? Esta acción no se puede deshacer."
        onConfirm={confirmDeleteAccount}
        onCancel={() => setOpenDeleteDialog(false)}
        confirmText="Eliminar"
        cancelText="Cancelar"
        severity="error"
      />

      {/* ====== Snackbar ====== */}
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
          sx={{
            width: "100%",
            bgcolor: (t) =>
              snackbar.severity === "success"
                ? t.palette.secondary.main
                : snackbar.severity === "error"
                ? t.palette.error.main
                : t.palette.info.main,
            color: "#fff",
          }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </DashboardLayout>
  );
}
