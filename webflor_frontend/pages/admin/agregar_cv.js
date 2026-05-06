import React, { useState } from "react";
import useAdminAuth from "../../hooks/useAdminAuth";
import DashboardLayout from "../../components/DashboardLayout";
import {
  Container,
  Paper,
  Box,
  Typography,
  Button,
  Snackbar,
  CssBaseline,
  LinearProgress,
  Card,
  CardHeader,
  CardContent,
  IconButton,
  List,
  ListItem,
  ListItemText,
  Divider,
  Alert
} from "@mui/material";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import ErrorIcon from "@mui/icons-material/Error";
import DeleteIcon from "@mui/icons-material/Delete";
import CloudUploadIcon from "@mui/icons-material/CloudUpload";
import ClearAllIcon from "@mui/icons-material/ClearAll";
import axios from "axios";
import Head from "next/head";

export default function AdminAgregarCV({ toggleDarkMode, currentMode }) {
  useAdminAuth();

  const [selectedFiles, setSelectedFiles] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [results, setResults] = useState([]);
  const [snackbar, setSnackbar] = useState({
    open: false,
    severity: "success",
    message: ""
  });

  const handleFilesChange = (e) => {
    const filesArray = Array.from(e.target.files);
    setSelectedFiles(filesArray);
  };

  const clearSelection = () => {
    setSelectedFiles([]);
  };

  const clearResults = () => {
    setResults([]);
  };

  const uploadFiles = async () => {
    if (selectedFiles.length === 0) {
      setSnackbar({
        open: true,
        severity: "error",
        message: "Por favor, selecciona al menos un archivo."
      });
      return;
    }
    const formData = new FormData();
    selectedFiles.forEach((file) => {
      formData.append("files", file);
    });

    // Obtener el token almacenado en localStorage bajo "adminToken"
    const token = localStorage.getItem("adminToken");

    if (!token) {
      setSnackbar({
        open: true,
        severity: "error",
        message: "Error: Usuario no autenticado."
      });
      return;
    }

    setUploading(true);
    try {
      const res = await axios.post(
        `${process.env.NEXT_PUBLIC_API_URL}/admin_upload`,
        formData,
        {
          headers: {
            "Content-Type": "multipart/form-data",
            "Authorization": `Bearer ${token}`
          },
          onUploadProgress: (progressEvent) => {
            const percentCompleted = Math.round(
              (progressEvent.loaded * 100) / progressEvent.total
            );
            setUploadProgress(percentCompleted);
          }
        }
      );
      setResults(res.data.results);
      setSnackbar({
        open: true,
        severity: "success",
        message: "CVs procesados correctamente."
      });
      setTimeout(() => {
        clearResults();
      }, 60000);
      clearSelection();
    } catch (error) {
      console.error("Error en la carga de CVs", error);
      setSnackbar({
        open: true,
        severity: "error",
        message: "Error procesando los CVs."
      });
    } finally {
      setUploading(false);
      setUploadProgress(0);
    }
  };

  return (
    <DashboardLayout toggleDarkMode={toggleDarkMode} currentMode={currentMode}>
      <Head>
        <title>Agregar CVs - Administrador</title>
      </Head>
      <CssBaseline />
      <Container maxWidth="md" sx={{ py: 4 }}>
        <Paper sx={{ p: 4 }}>
          <Typography variant="h4" align="center" gutterBottom>
            Agregar CVs
          </Typography>

          {/* Sección para seleccionar archivos */}
          <Box sx={{ mb: 2 }}>
            <Button
              variant="contained"
              component="label"
              startIcon={<CloudUploadIcon />}
            >
              Seleccionar CVs (PDF)
              <input
                type="file"
                accept=".pdf"
                multiple
                hidden
                onChange={handleFilesChange}
              />
            </Button>
            {selectedFiles.length > 0 && (
              <Box sx={{ mt: 2 }}>
                <Typography variant="subtitle1">
                  Archivos seleccionados:
                </Typography>
                <List>
                  {selectedFiles.map((file, index) => (
                    <ListItem key={index} divider>
                      <ListItemText
                        primary={file.name}
                        secondary={`${(file.size / 1024).toFixed(2)} KB`}
                      />
                    </ListItem>
                  ))}
                </List>
                <Box sx={{ display: "flex", gap: 2, mt: 1 }}>
                  <Button
                    variant="outlined"
                    onClick={clearSelection}
                    startIcon={<ClearAllIcon />}
                  >
                    Limpiar selección
                  </Button>
                  <Button
                    variant="contained"
                    color="primary"
                    onClick={uploadFiles}
                    startIcon={<CloudUploadIcon />}
                  >
                    Subir CVs
                  </Button>
                </Box>
              </Box>
            )}
          </Box>

          {/* Indicador de progreso durante la subida */}
          {uploading && (
            <Box sx={{ display: "flex", alignItems: "center", gap: 2, mb: 2 }}>
              <LinearProgress
                sx={{ flex: 1 }}
                variant="determinate"
                value={uploadProgress}
              />
              <Typography variant="body2">{uploadProgress}%</Typography>
            </Box>
          )}

          {/* Panel de resultados y logs */}
          {results.length > 0 && (
            <Box sx={{ mt: 4 }}>
              <Box
                sx={{
                  display: "flex",
                  justifyContent: "space-between",
                  mb: 1
                }}
              >
                <Typography variant="h6">Resultados del proceso</Typography>
                <IconButton onClick={clearResults} title="Limpiar logs">
                  <DeleteIcon />
                </IconButton>
              </Box>
              {results.map((result, index) => (
                <Card key={index} sx={{ mb: 2 }}>
                  <CardHeader
                    avatar={
                      result.status === "success" ? (
                        <CheckCircleIcon color="success" />
                      ) : (
                        <ErrorIcon color="error" />
                      )
                    }
                    title={`${result.file} ${
                      result.email ? `(Email: ${result.email})` : ""
                    }`}
                    subheader={result.message}
                  />
                  <Divider />
                  <CardContent>
                    <Typography variant="subtitle2" gutterBottom>
                      Logs del proceso:
                    </Typography>
                    <List dense>
                      {result.logs &&
                        result.logs.map((log, i) => (
                          <ListItem key={i}>
                            <ListItemText primary={log} />
                          </ListItem>
                        ))}
                    </List>
                  </CardContent>
                </Card>
              ))}
            </Box>
          )}
        </Paper>
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
            sx={{ width: "100%" }}
          >
            {snackbar.message}
          </Alert>
        </Snackbar>
      </Container>
    </DashboardLayout>
  );
}
