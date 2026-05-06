import { useState } from "react";
import { useRouter } from "next/router";
import { useTheme } from "@mui/material/styles";
import {
  Box,
  Container,
  Typography,
  TextField,
  Button,
  Snackbar,
  Alert,
  GlobalStyles,
} from "@mui/material";
import Link from "next/link";

export default function ForgotPassword() {
  const theme = useTheme();
  const [email, setEmail] = useState("");
  const [snackbar, setSnackbar] = useState({ open: false, message: "", severity: "success" });
  const router = useRouter();

  const handleSubmit = async (e) => {
    e.preventDefault();
    const res = await fetch("/api/auth/forgot-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    });
    const data = await res.json();
    if (res.ok) {
      setSnackbar({ open: true, message: data.message, severity: "success" });
    } else {
      setSnackbar({ open: true, message: data.error, severity: "error" });
    }
  };

  return (
    <>
      {/* GlobalStyles para evitar que el autofill cambie el fondo en modo oscuro */}
      <GlobalStyles
        styles={{
          "input:-webkit-autofill, input:-webkit-autofill:focus, input:-webkit-autofill:hover": {
            WebkitBoxShadow: `0 0 0 1000px ${theme.palette.background.paper} inset !important`,
            boxShadow: `0 0 0 1000px ${theme.palette.background.paper} inset !important`,
            WebkitTextFillColor: `${theme.palette.text.primary} !important`,
          },
        }}
      />
      <Box
        sx={{
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          bgcolor: "background.default",
        }}
      >
        <Container
          maxWidth="sm"
          sx={{
            textAlign: "center",
            p: 4,
            boxShadow: 3,
            borderRadius: 2,
            bgcolor: "background.paper",
          }}
        >
          <Typography variant="h4" gutterBottom>
            Recuperar Contraseña
          </Typography>
          <Typography variant="body1" gutterBottom>
            Ingrese su correo para recibir instrucciones para restablecer su contraseña.
          </Typography>
          <Box component="form" onSubmit={handleSubmit} sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
            <TextField
              label="Correo Electrónico"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              fullWidth
              required
              InputProps={{
                sx: {
                  backgroundColor: "transparent",
                  "&:hover": {
                    backgroundColor: "transparent",
                  },
                  "&.Mui-focused": {
                    backgroundColor: "transparent",
                  },
                  input: {
                    color: theme.palette.text.primary, // Texto en color correcto para modo claro/oscuro
                  },
                },
              }}
            />
            <Button type="submit" variant="contained" color="primary" fullWidth>
              Enviar Instrucciones
            </Button>
          </Box>
          <Typography variant="body2" sx={{ mt: 2 }}>
            <Link href="/login" style={{ color: "#1976d2", textDecoration: "none" }}>
              Volver a Iniciar Sesión
            </Link>
          </Typography>
        </Container>
        <Snackbar
          open={snackbar.open}
          autoHideDuration={4000}
          onClose={() => setSnackbar({ ...snackbar, open: false })}
          anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
        >
          <Alert onClose={() => setSnackbar({ ...snackbar, open: false })} severity={snackbar.severity} sx={{ width: "100%" }}>
            {snackbar.message}
          </Alert>
        </Snackbar>
      </Box>
    </>
  );
}
