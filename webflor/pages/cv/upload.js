import { useState } from "react";
import Head from "next/head";
import axios from "axios";
import {
  Container,
  Box,
  Typography,
  TextField,
  Button,
  Paper,
  LinearProgress,
  Snackbar,
  Alert,
} from "@mui/material";
import UploadFileIcon from "@mui/icons-material/UploadFile";
import MainLayout from "../../components/MainLayout";

const API_URL =
  process.env.NEXT_PUBLIC_API_URL || "https://api.fapmendoza.online";

export default function UploadCVPage() {
  const [email, setEmail] = useState("");
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState("");
  const [snackbar, setSnackbar] = useState({
    open: false,
    severity: "success",
    message: "",
  });

  const uploadFile = async (file) => {
    if (!file) {
      return setSnackbar({
        open: true,
        severity: "warning",
        message: "Por favor seleccioná un archivo.",
      });
    }
    const form = new FormData();
    form.append("file", file);
    if (email.trim()) form.append("email", email.trim().toLowerCase());

    setUploading(true);
    setMessage("");
    try {
      const res = await axios.post(`${API_URL}/cv/upload`, form, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      setMessage(res.data.message || "CV procesado exitosamente.");
      setSnackbar({
        open: true,
        severity: "success",
        message: "CV procesado. Revisá tu correo (incluido spam).",
      });
    } catch (err) {
      console.error("Error subiendo el CV:", err);
      const detail =
        err.response?.data?.detail || "Ocurrió un error al procesar tu CV.";
      setMessage(detail);
      setSnackbar({ open: true, severity: "error", message: detail });
    } finally {
      setUploading(false);
    }
  };

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (file) uploadFile(file);
  };

  return (
    <>
      <Head>
        <title>Subí tu CV — FAP Mendoza</title>
      </Head>

      <MainLayout>
        {/* Hero */}
        <Box
          sx={{
            background:
              "linear-gradient(135deg,#0B2A2D 0%,#103B40 50%,#155158 100%)",
            color: "#FFF",
            textAlign: "center",
            py: { xs: 6, md: 8 },
          }}
        >
          <Container maxWidth="sm">
            <Typography variant="h5" gutterBottom>
              ¡Bienvenidos a FAP Mendoza!
            </Typography>
            <Typography
              variant="h2"
              sx={{ fontWeight: 700, lineHeight: 1.2 }}
            >
              Subí tu CV
            </Typography>
            <Typography variant="body1" sx={{ opacity: 0.8, mt: 2 }}>
              En segundos generamos una descripción profesional de tu
              currículum y te creamos una cuenta para que puedas postularte a
              ofertas laborales.
            </Typography>
          </Container>
        </Box>

        {/* Upload Form */}
        <Container maxWidth="sm" sx={{ py: 8 }}>
          <Paper elevation={3} sx={{ p: 4, borderTop: "6px solid #D96236" }}>
            <Box sx={{ display: "flex", flexDirection: "column", gap: 3 }}>
              <TextField
                label="Correo electrónico (opcional)"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                helperText="Si lo deseás, asociamos tu CV a este email."
                fullWidth
              />

              <Button
                variant="contained"
                component="label"
                startIcon={<UploadFileIcon />}
                size="large"
                disabled={uploading}
                sx={{
                  bgcolor: "#D96236",
                  "&:hover": { bgcolor: "#c0552f" },
                }}
              >
                {uploading ? "Subiendo..." : "Seleccionar CV (PDF o DOCX)"}
                <input
                  type="file"
                  accept=".pdf,.doc,.docx"
                  hidden
                  onChange={handleFileChange}
                />
              </Button>

              {uploading && <LinearProgress />}

              {message && (
                <Alert
                  severity={message.includes("Error") || message.includes("error") ? "error" : "success"}
                >
                  {message}
                </Alert>
              )}
            </Box>
          </Paper>
        </Container>

        {/* Snackbar */}
        <Snackbar
          open={snackbar.open}
          autoHideDuration={4000}
          onClose={() => setSnackbar((s) => ({ ...s, open: false }))}
          anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
        >
          <Alert
            onClose={() => setSnackbar((s) => ({ ...s, open: false }))}
            severity={snackbar.severity}
            variant="filled"
            sx={{ width: "100%" }}
          >
            {snackbar.message}
          </Alert>
        </Snackbar>
      </MainLayout>
    </>
  );
}
