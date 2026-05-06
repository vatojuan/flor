import { signIn } from "next-auth/react";
import { useState } from "react";
import { useTheme } from "@mui/material/styles";
import { 
  Box, 
  Container, 
  Typography, 
  TextField, 
  Button, 
  Divider, 
  Snackbar, 
  Alert,
  GlobalStyles,
  IconButton,
  InputAdornment
} from "@mui/material";
import GoogleIcon from "@mui/icons-material/Google";
import Visibility from "@mui/icons-material/Visibility";
import VisibilityOff from "@mui/icons-material/VisibilityOff";
import Link from "next/link";

export default function Login() {
  const theme = useTheme();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [snackbar, setSnackbar] = useState({ open: false, message: "", severity: "success" });
  const [showPassword, setShowPassword] = useState(false);

  // Iniciar sesión con email y contraseña
  const handleEmailLogin = async (e) => {
    e.preventDefault();
    const result = await signIn("credentials", {
      redirect: false,
      email: email.toLowerCase(), // Convertir a minúsculas
      password,
      callbackUrl: "/dashboard",
    });

    if (result?.ok) {
      window.location.href = "/dashboard";
    } else {
      setSnackbar({ open: true, message: "Error al iniciar sesión. Verifica tus credenciales.", severity: "error" });
    }
  };

  // Iniciar sesión con Google
  const handleGoogleLogin = () => {
    signIn("google", { callbackUrl: "/dashboard", prompt: "select_account" });
  };

  return (
    <>
      {/* GlobalStyles para que el autofill use el mismo fondo y color que el resto de los inputs */}
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
          bgcolor: "background.default" 
        }}
      >
        <Container 
          maxWidth="sm" 
          sx={{ 
            textAlign: "center", 
            p: 4, 
            boxShadow: 3, 
            borderRadius: 2, 
            bgcolor: "background.paper" 
          }}
        >
          <Typography variant="h4" gutterBottom>
            Iniciar Sesión
          </Typography>

          {/* Botón de Google */}
          <Button 
            onClick={handleGoogleLogin} 
            variant="contained" 
            startIcon={<GoogleIcon />} 
            fullWidth 
            sx={{ mb: 3, bgcolor: "#DB4437", color: "#fff", "&:hover": { bgcolor: "#b73c2f" } }}
          >
            Registrar o Iniciar sesión con Google
          </Button>

          <Divider sx={{ my: 3 }}>O usa tu email</Divider>

          {/* Formulario de inicio de sesión */}
          <Box component="form" onSubmit={handleEmailLogin} sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
            <TextField 
              label="Correo Electrónico" 
              type="email" 
              value={email} 
              onChange={(e) => setEmail(e.target.value)} 
              fullWidth 
              required 
            />
            <TextField 
              label="Contraseña" 
              type={showPassword ? "text" : "password"}
              value={password} 
              onChange={(e) => setPassword(e.target.value)} 
              fullWidth 
              required 
              InputProps={{
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton
                      onClick={() => setShowPassword((prev) => !prev)}
                      edge="end"
                      aria-label="toggle password visibility"
                    >
                      {showPassword ? <VisibilityOff /> : <Visibility />}
                    </IconButton>
                  </InputAdornment>
                ),
              }}
            />
            <Button type="submit" variant="contained" color="primary" fullWidth>
              Iniciar Sesión
            </Button>
          </Box>

          <Typography variant="body2" sx={{ mt: 2 }}>
            ¿No tienes cuenta?{" "}
            <Link href="/register" style={{ color: "#1976d2", textDecoration: "none" }}>
              Regístrate aquí
            </Link>
          </Typography>
          
          <Typography variant="body2" sx={{ mt: 1 }}>
            ¿Olvidaste tu contraseña?{" "}
            <Link href="/forgot-password" style={{ color: "#1976d2", textDecoration: "none" }}>
              Recuperarla
            </Link>
          </Typography>

          {/* Botón para volver a la página de inicio */}
          <Button 
            component={Link} 
            href="/" 
            variant="outlined" 
            color="primary" 
            fullWidth 
            sx={{ mt: 2 }}
          >
            Volver a Inicio
          </Button>
        </Container>

        {/* Notificación Snackbar */}
        <Snackbar 
          open={snackbar.open} 
          autoHideDuration={4000} 
          onClose={() => setSnackbar({ ...snackbar, open: false })} 
          anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
        >
          <Alert 
            onClose={() => setSnackbar({ ...snackbar, open: false })} 
            severity={snackbar.severity} 
            sx={{ width: "100%" }}
          >
            {snackbar.message}
          </Alert>
        </Snackbar>
      </Box>
    </>
  );
}
