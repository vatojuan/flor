import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import axios from "axios";
import Head from "next/head";
import { Container, Paper, Typography, CssBaseline, Box, Button, CircularProgress, Alert } from "@mui/material";
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline';
// Se elimina la importación de 'Link' ya que no se usará para navegación externa.

// Definimos los diferentes estados para manejar la UI
const STATUS = {
  LOADING: 'loading',
  SUCCESS: 'success',
  ERROR: 'error'
};

export default function ConfirmEmailPage() {
  const router = useRouter();
  const { code } = router.query;
  const [status, setStatus] = useState(STATUS.LOADING);
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    // Solo ejecutamos la llamada a la API si el 'code' está presente en la URL
    if (code) {
      setStatus(STATUS.LOADING);
      axios
        .get(`${process.env.NEXT_PUBLIC_API_URL}/cv/confirm?code=${code}`)
        .then(() => {
          // Si la API responde con éxito, cambiamos el estado a SUCCESS
          setStatus(STATUS.SUCCESS);
        })
        .catch((error) => {
          // Si hay un error, lo guardamos y cambiamos el estado a ERROR
          console.error("❌ Error al confirmar:", error);
          const detail = error.response?.data?.detail || "Ocurrió un error inesperado. Por favor, intenta de nuevo.";
          setErrorMessage(detail);
          setStatus(STATUS.ERROR);
        });
    }
  }, [code]);

  const renderContent = () => {
    switch (status) {
      case STATUS.LOADING:
        return (
          <>
            <Typography variant="h5" gutterBottom>
              Procesando tu confirmación...
            </Typography>
            <CircularProgress sx={{ mt: 2 }} />
          </>
        );
      case STATUS.SUCCESS:
        return (
          <>
            <CheckCircleOutlineIcon color="success" sx={{ fontSize: 60, mb: 2 }} />
            <Typography variant="h4" gutterBottom>
              ¡Cuenta confirmada!
            </Typography>
            <Alert severity="success" sx={{ mt: 2, mb: 3, textAlign: 'left' }}>
              <Typography variant="body1">
                Tu cuenta ha sido activada exitosamente.
              </Typography>
              <Typography variant="body1" sx={{ mt: 1 }}>
                <strong>Hemos enviado tus credenciales de acceso (usuario y contraseña temporal) a tu correo electrónico.</strong> Por favor, revisa tu bandeja de entrada (y la carpeta de spam).
              </Typography>
            </Alert>
            {/* --- CORRECCIÓN CLAVE --- */}
            {/* Se reemplaza el <Link> por un <Button> que actúa como un enlace externo (<a>) */}
            <Button 
              variant="contained" 
              size="large"
              component="a" // Le decimos al botón que se comporte como un ancla (enlace)
              href="https://www.fapmendoza.com/login" // URL absoluta al dominio de los usuarios
            >
              Ir a Iniciar Sesión
            </Button>
          </>
        );
      case STATUS.ERROR:
        return (
          <>
            <ErrorOutlineIcon color="error" sx={{ fontSize: 60, mb: 2 }} />
            <Typography variant="h4" gutterBottom>
              Error en la confirmación
            </Typography>
            <Alert severity="error" sx={{ mt: 2 }}>
              {errorMessage}
            </Alert>
          </>
        );
      default:
        return null;
    }
  };

  return (
    <>
      <Head>
        <title>Confirmación de Email - FAP Mendoza</title>
        <link rel="icon" href="/favicon.ico" />
      </Head>
      <CssBaseline />
      <Container maxWidth="sm" sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh' }}>
        <Paper elevation={3} sx={{ p: 4, textAlign: "center", width: '100%' }}>
          <Box>
            {renderContent()}
          </Box>
        </Paper>
      </Container>
    </>
  );
}
