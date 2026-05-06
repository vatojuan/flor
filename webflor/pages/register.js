import { useState } from "react";
import { useRouter } from "next/router";
import { useTheme } from "@mui/material/styles";
import {
  Box,
  Container,
  Typography,
  TextField,
  Button,
  MenuItem,
  Select,
  FormControl,
  InputLabel,
  Snackbar,
  Alert,
  GlobalStyles,
  IconButton,
  InputAdornment,
} from "@mui/material";
import Link from "next/link";
import Visibility from "@mui/icons-material/Visibility";
import VisibilityOff from "@mui/icons-material/VisibilityOff";

export default function Register() {
  const theme = useTheme();
  const [userType, setUserType] = useState("empleado");
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [snackbar, setSnackbar] = useState({ open: false, message: "", severity: "success" });
  const [showPassword, setShowPassword] = useState(false);
  const router = useRouter();

  // Función para validar que la contraseña sea segura
  const validatePassword = (pass) => {
    // Mínimo 8 caracteres, una mayúscula, una minúscula, un número y un carácter especial.
    const regex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&#])[A-Za-z\d@$!%*?&#]{8,}$/;
    return regex.test(pass);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
  
    // Validar la contraseña antes de enviar
    if (!validatePassword(password)) {
      setPasswordError(
        "La contraseña debe tener al menos 8 caracteres, incluir mayúsculas, minúsculas, números y caracteres especiales."
      );
      return;
    } else {
      setPasswordError("");
    }
  
    const res = await fetch("/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: email.toLowerCase(), name, password, role: userType }),
    });
  
    if (res.ok) {
      setSnackbar({
        open: true,
        message: "Registro exitoso. Revisa tu correo para confirmar la cuenta.",
        severity: "success",
      });
      // Redirige a la página de verificación pasando el email en la query string
      setTimeout(() => router.push(`/verify?email=${encodeURIComponent(email)}`), 3000);
    } else {
      const data = await res.json();
      setSnackbar({ open: true, message: "Error en el registro: " + data.error, severity: "error" });
    }
  };  

  return (
    <>
      {/* GlobalStyles para que el autofill use el mismo fondo y color del contenedor */}
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
            Registro
          </Typography>

          <Box component="form" onSubmit={handleSubmit} sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
            <FormControl fullWidth sx={{ mb: 1 }}>
              <InputLabel id="user-type-label">Tipo de Usuario</InputLabel>
              <Select
                labelId="user-type-label"
                value={userType}
                label="Tipo de Usuario"
                onChange={(e) => setUserType(e.target.value)}
                required
              >
                <MenuItem value="empleado">Empleado</MenuItem>
                <MenuItem value="empleador">Empleador</MenuItem>
              </Select>
            </FormControl>

            <TextField
              label="Correo Electrónico"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              fullWidth
              required
            />
            <TextField
              label="Nombre"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
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
              error={Boolean(passwordError)}
              helperText={passwordError}
              InputProps={{
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton onClick={() => setShowPassword((prev) => !prev)} edge="end">
                      {showPassword ? <VisibilityOff /> : <Visibility />}
                    </IconButton>
                  </InputAdornment>
                ),
              }}
            />
            <Button type="submit" variant="contained" color="primary" fullWidth>
              Registrarse
            </Button>
          </Box>

          <Typography variant="body2" sx={{ mt: 2 }}>
            ¿Ya tienes cuenta?{" "}
            <Link href="/login" style={{ color: "#1976d2", textDecoration: "none" }}>
              Inicia sesión aquí
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
