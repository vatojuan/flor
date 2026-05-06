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
  Divider,
  Snackbar,
  Alert,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  LinearProgress,
} from "@mui/material";
import DeleteIcon from "@mui/icons-material/Delete";

export default function ProfileEmpleado() {
  const { data: session, status, update } = useSession();
  const router = useRouter();

  // Estados para el perfil
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [description, setDescription] = useState("");
  const [loading, setLoading] = useState(false);

  // Estado para la imagen de perfil
  const [profileImageUrl, setProfileImageUrl] = useState(
    "/images/default-user.png"
  );

  // Handler para renovar la imagen en caso de error
  const handleImageError = async () => {
    try {
      const res = await axios.get("/api/employee/renew-profile-picture");
      if (res.data?.url) {
        setProfileImageUrl(res.data.url);
      }
    } catch (error) {
      console.error("Error renovando la URL de la imagen:", error);
    }
  };

  // Estados para la imagen de perfil subida y mensajes
  const [selectedProfileImage, setSelectedProfileImage] = useState(null);
  const [profileImageMessage, setProfileImageMessage] = useState("");

  // Estados para documentos legales
  const [selectedDocument, setSelectedDocument] = useState(null);
  const [uploadMessage, setUploadMessage] = useState("");
  const [documents, setDocuments] = useState([]);
  const [uploading, setUploading] = useState(false);

  const [snackbar, setSnackbar] = useState({
    open: false,
    message: "",
    severity: "success",
  });

  // Diálogo para eliminar documento
  const [openDocDeleteDialog, setOpenDocDeleteDialog] = useState(false);
  const [selectedDocId, setSelectedDocId] = useState(null);

  // Diálogo para eliminar cuenta
  const [openDeleteDialog, setOpenDeleteDialog] = useState(false);

  const handleCloseDeleteDialog = () => {
    setOpenDeleteDialog(false);
  };

  const confirmDeleteAccount = async () => {
    try {
      const res = await axios.delete("/api/user/delete");
      if (res.status === 200) {
        setSnackbar({
          open: true,
          message: "Cuenta eliminada correctamente",
          severity: "success",
        });
        await signOut({ redirect: false });
        router.push("/login");
      }
    } catch (error) {
      console.error("Error al eliminar la cuenta:", error);
      setSnackbar({
        open: true,
        message: "Error al eliminar la cuenta",
        severity: "error",
      });
    } finally {
      setOpenDeleteDialog(false);
    }
  };

  // Cargar perfil del empleado
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
              } catch (error) {
                console.error(
                  "Error renovando la URL firmada de la imagen:",
                  error
                );
              }
            }
          }
        })
        .catch((err) => console.error("Error al cargar el perfil:", err));
    }
  }, [session]);

  // Cargar documentos subidos
  useEffect(() => {
    if (session) {
      axios
        .get("/api/employee/documents")
        .then((res) => {
          setDocuments(res.data.documents);
        })
        .catch((err) => console.error("Error al cargar documentos:", err));
    }
  }, [session]);

  useEffect(() => {
    if (status !== "loading" && !session) {
      router.push("/login");
    }
  }, [session, status, router]);

  const handleProfileUpdate = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      // 1. La llamada a la API. Esta debe actualizar la tabla User en el backend.
      await axios.put("/api/employee/profile", { name, phone, description });

      // 2. Forzamos una recarga de la sesión desde el servidor.
      // Esto obtendrá el nombre actualizado que acabamos de guardar en la tabla User.
      await update();

      setSnackbar({
        open: true,
        message: "Perfil actualizado exitosamente",
        severity: "success",
      });
    } catch (error) {
      console.error("Error actualizando el perfil:", error);
      setSnackbar({
        open: true,
        message: "Error actualizando el perfil",
        severity: "error",
      });
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
      // 1. La llamada a la API. Debe actualizar el campo 'image' en la tabla User.
      const res = await axios.post(
        "/api/employee/upload-profile-picture",
        formData,
        {
          headers: { "Content-Type": "multipart/form-data" },
        }
      );

      // 2. Forzamos la recarga de la sesión para obtener la nueva URL de la imagen.
      await update();

      // 3. Actualizamos la URL localmente para una respuesta visual inmediata.
      setProfileImageUrl(res.data.user.profilePicture);

      setSnackbar({
        open: true,
        message: "Imagen actualizada",
        severity: "success",
      });
    } catch (error) {
      console.error("Error actualizando la imagen de perfil:", error);
      setProfileImageMessage("Error al actualizar la imagen de perfil.");
      setSnackbar({
        open: true,
        message: "Error actualizando imagen",
        severity: "error",
      });
    }
  };

  // Restricciones para archivos
  const MAX_FILE_SIZE_MB = 5; // Tamaño máximo en MB
  const MAX_FILES = 5; // Número máximo de archivos permitidos

  // Subida automática del documento al seleccionar el archivo
  const handleDocumentFileChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (documents.length >= MAX_FILES) {
      setSnackbar({
        open: true,
        message: `Solo se permiten ${MAX_FILES} documentos.`,
        severity: "error",
      });
      return;
    }

    const fileSizeMB = file.size / (1024 * 1024);
    if (fileSizeMB > MAX_FILE_SIZE_MB) {
      setSnackbar({
        open: true,
        message: `El archivo es demasiado grande. Máximo permitido: ${MAX_FILE_SIZE_MB} MB.`,
        severity: "error",
      });
      return;
    }

    setSelectedDocument(file);
    setUploading(true);
    const formData = new FormData();
    formData.append("document", file);
    if (session && session.user && session.user.id) {
      formData.append("userId", session.user.id);
    }
    try {
      await axios.post(
        "/api/employee/upload-document",
        formData,
        {
          headers: { "Content-Type": "multipart/form-data" },
        }
      );
      setUploadMessage("Documento subido correctamente.");
      setSnackbar({
        open: true,
        message: "Documento subido",
        severity: "success",
      });
      const updatedDocs = await axios.get("/api/employee/documents");
      setDocuments(updatedDocs.data.documents);
    } catch (error) {
      console.error("Error al subir el documento:", error);
      setUploadMessage("Error al subir el documento.");
      setSnackbar({
        open: true,
        message: "Error subiendo documento",
        severity: "error",
      });
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
      await axios.delete("/api/employee/delete-document", {
        data: { documentId: selectedDocId },
      });
      const updatedDocs = await axios.get("/api/employee/documents");
      setDocuments(updatedDocs.data.documents);
      setSnackbar({
        open: true,
        message: "Documento eliminado correctamente",
        severity: "success",
      });
    } catch (error) {
      console.error("Error al eliminar el documento:", error);
      setSnackbar({
        open: true,
        message: "Error al eliminar el documento",
        severity: "error",
      });
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

  return (
    <DashboardLayout userRole={session?.user?.role || "empleado"}>
      <Box sx={{ textAlign: "center", mt: 4 }}>
        <Typography variant="h4" gutterBottom>
          Perfil de Empleado
        </Typography>
        <Box sx={{ mb: 2 }}>
          <ProfileImage
            currentImage={profileImageUrl}
            onImageSelected={(file) => handleProfileImageUpload(file)}
            onError={handleImageError}
          />
        </Box>
        <Paper sx={{ maxWidth: 500, mx: "auto", p: 3 }}>
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
              onChange={(e) => setDescription(e.target.value)}
              required
              helperText="La descripción se usará para facilitar las búsquedas y matching. Máximo 1000 caracteres."
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
                <Button variant="contained" color="primary">
                  Cambiar Contraseña
                </Button>
              </Link>
            </Box>
          )}
        </Paper>
        <Divider sx={{ my: 3 }} />
        <Paper sx={{ maxWidth: 500, mx: "auto", p: 3 }}>
          <Typography variant="h6" gutterBottom>
            Subir CV o Archivo De Interes
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Se permiten hasta {MAX_FILES} documentos. Tamaño máximo de cada
            archivo: {MAX_FILE_SIZE_MB} MB.
          </Typography>
          <Button variant="contained" component="label" sx={{ mt: 1 }}>
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
            <Typography
              variant="body2"
              color="text.secondary"
              sx={{ mt: 1 }}
            >
              {uploadMessage}
            </Typography>
          )}
        </Paper>
        <Typography variant="h6" gutterBottom sx={{ mt: 3 }}>
          Archivos
        </Typography>
        {documents.length === 0 ? (
          <Typography variant="body2" color="text.secondary">
            No hay documentos subidos.
          </Typography>
        ) : (
          <Box
            component="ul"
            sx={{ listStyle: "none", p: 0, maxWidth: 500, mx: "auto" }}
          >
            {documents.map((doc) => (
              <Box
                component="li"
                key={doc.id}
                sx={{ mb: 1, display: "flex", alignItems: "center" }}
              >
                <Box sx={{ flexGrow: 1 }}>
                  <Button
                    fullWidth
                    variant="text"
                    onClick={async (e) => {
                      e.preventDefault();
                      try {
                        const res = await axios.get(
                          `/api/employee/get-signed-url?fileName=${encodeURIComponent(
                            doc.fileKey
                          )}`
                        );
                        if (!res.data || !res.data.url) {
                          throw new Error("Error al obtener la URL firmada");
                        }
                        window.open(res.data.url, "_blank");
                      } catch (error) {
                        console.error("Error al descargar el documento:", error);
                      }
                    }}
                    sx={{
                      textTransform: "none",
                      justifyContent: "flex-start",
                      padding: "20px",
                      color: "#1976d2",
                      backgroundColor: "transparent",
                      "&:hover": {
                        backgroundColor: "rgba(25, 118, 210, 0.04)",
                      },
                    }}
                  >
                    {doc.originalName || "Documento"}
                  </Button>
                </Box>
                <IconButton
                  color="error"
                  onClick={() => {
                    setSelectedDocId(doc.id);
                    setOpenDocDeleteDialog(true);
                  }}
                >
                  <DeleteIcon />
                </IconButton>
              </Box>
            ))}
          </Box>
        )}
        <Divider sx={{ my: 3 }} />
        <Box sx={{ textAlign: "center", mt: 2 }}>
          <Link href="/dashboard" style={{ textDecoration: "none" }}>
            <Button variant="contained" color="primary">
              Volver al Dashboard
            </Button>
          </Link>
        </Box>
        <Box
          sx={{
            mt: 4,
            display: "flex",
            justifyContent: "flex-end",
            borderTop: "1px solid red",
            pt: 2,
          }}
        >
          <Button
            onClick={handleDeleteAccount}
            variant="contained"
            color="warning"
          >
            Eliminar Cuenta
          </Button>
        </Box>
      </Box>

      <Dialog open={openDocDeleteDialog} onClose={cancelDeleteDocument}>
        <DialogTitle>Confirmar Eliminación de Documento</DialogTitle>
        <DialogContent>
          <Typography>
            ¿Estás seguro de que deseas eliminar este documento?
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={cancelDeleteDocument} color="primary">
            Cancelar
          </Button>
          <Button
            onClick={confirmDeleteDocument}
            color="secondary"
            variant="contained"
          >
            Eliminar
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={openDeleteDialog} onClose={() => setOpenDeleteDialog(false)}>
        <DialogTitle>Confirmar Eliminación de Cuenta</DialogTitle>
        <DialogContent>
          <Typography>
            ¿Estás seguro de que deseas eliminar tu cuenta? Esta acción no se
            puede deshacer.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenDeleteDialog(false)} color="primary">
            Cancelar
          </Button>
          <Button
            onClick={confirmDeleteAccount}
            color="secondary"
            variant="contained"
          >
            Eliminar
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar
        open={snackbar.open}
        autoHideDuration={4000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
        anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
      >
        <Alert
          onClose={() => setSnackbar({ ...snackbar, open: false })}
          severity={snackbar.severity}
          variant="filled"
          sx={{
            width: "100%",
            bgcolor: (theme) =>
              snackbar.severity === "success"
                ? theme.palette.secondary.main
                : snackbar.severity === "error"
                ? theme.palette.error.main
                : theme.palette.info.main,
            color: "#fff",
          }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </DashboardLayout>
  );
}
