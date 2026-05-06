// pages/cv/upload.js
import { useState } from "react";
import axios from "axios";
import Head from "next/head";
import PublicLayout from "../../components/PublicLayout";
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

export default function UploadCVPage() {
  const [email, setEmail] = useState("");
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState("");
  const [extractedText, setExtractedText] = useState("");
  const [embedding, setEmbedding] = useState(null);
  const [snackbar, setSnackbar] = useState({
    open: false,
    severity: "success",
    message: "",
  });

  const uploadFile = async (file) => {
    if (!file) {
      return setSnackbar({ open: true, severity: "warning", message: "Por favor selecciona un archivo." });
    }
    const form = new FormData();
    form.append("file", file);
    if (email.trim()) form.append("email", email.trim().toLowerCase());

    setUploading(true);
    setMessage("");
    try {
      const res = await axios.post(
        `${process.env.NEXT_PUBLIC_API_URL}/cv/upload`,
        form,
        { headers: { "Content-Type": "multipart/form-data" } }
      );
      setMessage(res.data.message || "CV procesado exitosamente.");
      setSnackbar({
        open: true,
        severity: "success",
        message: "CV procesado. Revisa tu correo (spam incluido).",
      });
      if (res.data.extracted_text) setExtractedText(res.data.extracted_text);
      if (res.data.embedding) setEmbedding(res.data.embedding);
    } catch (err) {
      console.error("Error subiendo el CV:", err);
      setMessage("Error al procesar tu CV.");
      setSnackbar({ open: true, severity: "error", message: "Fallo al procesar tu CV." });
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
        <title>Subí tu CV — Webflor IA</title>
        <link rel="icon" href="/favicon.ico" />
      </Head>

      <PublicLayout>
        {/* Hero */}
        <Box
          sx={{
            background: "linear-gradient(135deg,#0B2A2D 0%,#103B40 50%,#155158 100%)",
            color: "#FFF",
            textAlign: "center",
            py: { xs: 6, md: 8 },
          }}
        >
          <Container maxWidth="sm">
            <Typography variant="h5" gutterBottom>
              ¡Bienvenidos a Fap Mendoza!
            </Typography>
            <Typography variant="h2" sx={{ fontWeight: 700, lineHeight: 1.2 }}>
              Subí tu CV
            </Typography>
            <Typography variant="body1" sx={{ opacity: 0.8, mt: 2 }}>
              En segundos generamos una descripción profesional de tu currículum.
            </Typography>
          </Container>
        </Box>

        {/* Upload Form */}
        <Container maxWidth="sm" sx={{ py: 8 }}>
          <Paper elevation={3} sx={{ p: 4, borderTop: "6px solid #D96236" }}>
            <Box sx={{ display: "flex", flexDirection: "column", gap: 3 }}>
              <Button
                variant="contained"
                component="label"
                startIcon={<UploadFileIcon />}
                size="large"
              >
                Seleccionar CV (PDF o DOCX)
                <input
                  type="file"
                  accept=".pdf,.doc,.docx"
                  hidden
                  onChange={handleFileChange}
                />
              </Button>

              <TextField
                label="Correo electrónico (opcional)"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                helperText="Si lo deseás, asociamos el resultado a este email."
                fullWidth
              />

              {uploading && <LinearProgress />}

              {message && (
                <Alert severity={message.includes("Error") ? "error" : "success"}>
                  {message}
                </Alert>
              )}
            </Box>

            {/* Extraction Result */}
            {extractedText && (
              <Box sx={{ mt: 6 }}>
                <Typography variant="h6" gutterBottom>
                  Texto extraído
                </Typography>
                <Paper sx={{ p: 2, maxHeight: 200, overflow: "auto" }}>
                  <Typography variant="body2" sx={{ whiteSpace: "pre-wrap" }}>
                    {extractedText}
                  </Typography>
                </Paper>
              </Box>
            )}

            {/* Embedding Result */}
            {embedding && (
              <Box sx={{ mt: 4 }}>
                <Typography variant="h6" gutterBottom>
                  Embedding generado
                </Typography>
                <Paper sx={{ p: 2, maxHeight: 200, overflow: "auto" }}>
                  <Typography
                    component="pre"
                    sx={{ fontFamily: "monospace", whiteSpace: "pre-wrap" }}
                  >
                    {JSON.stringify(embedding, null, 2)}
                  </Typography>
                </Paper>
              </Box>
            )}
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
      </PublicLayout>
    </>
  );
}
