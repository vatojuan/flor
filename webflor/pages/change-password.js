// pages/change-password.js
import { useState, useEffect } from "react";
import { useRouter } from "next/router";
import { useSession } from "next-auth/react";
import {
  Container,
  TextField,
  Button,
  Typography,
  Box,
  Snackbar,
  Alert,
  InputAdornment,
  IconButton,
} from "@mui/material";
import Visibility from "@mui/icons-material/Visibility";
import VisibilityOff from "@mui/icons-material/VisibilityOff";

export default function ChangePassword() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [snackbar, setSnackbar] = useState({ open: false, message: "", severity: "success" });

  // Estados para controlar la visibilidad de cada campo
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  useEffect(() => {
    if (status !== "loading" && !session) {
      router.push("/login");
    }
  }, [session, status, router]);

  // Función para validar que la nueva contraseña sea segura:
  // Ejemplo: al menos 8 caracteres, una mayúscula, un dígito y un carácter especial.
  const isPasswordSecure = (password) => {
    const regex = /^(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]).{8,}$/;
    return regex.test(password);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      setSnackbar({ open: true, message: "La nueva contraseña y la confirmación no coinciden", severity: "error" });
      return;
    }
    if (!isPasswordSecure(newPassword)) {
      setSnackbar({
        open: true,
        message: "La contraseña no es segura. Debe tener al menos 8 caracteres, una mayúscula, un dígito y un carácter especial.",
        severity: "error",
      });
      return;
    }
    try {
      const res = await fetch("/api/user/change-password", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",  // Agrega esta línea
        body: JSON.stringify({
          currentPassword,
          newPassword,
        }),
      });
      if (res.ok) {
        setSnackbar({ open: true, message: "Contraseña actualizada correctamente", severity: "success" });
        setTimeout(() => router.push("/dashboard"), 1500);
      } else {
        const data = await res.json();
        setSnackbar({ open: true, message: data.message || "Error actualizando la contraseña", severity: "error" });
      }
    } catch (error) {
      setSnackbar({ open: true, message: "Error actualizando la contraseña", severity: "error" });
    }
  };

  return (
    <Container maxWidth="sm" sx={{ mt: 4 }}>
      <Typography variant="h4" gutterBottom>
        Cambiar Contraseña
      </Typography>
      <Box component="form" onSubmit={handleSubmit} sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
        <TextField 
          label="Contraseña Actual" 
          type={showCurrent ? "text" : "password"}
          value={currentPassword} 
          onChange={(e) => setCurrentPassword(e.target.value)} 
          required 
          InputProps={{
            endAdornment: (
              <InputAdornment position="end">
                <IconButton onClick={() => setShowCurrent((prev) => !prev)} edge="end">
                  {showCurrent ? <VisibilityOff /> : <Visibility />}
                </IconButton>
              </InputAdornment>
            ),
          }}
        />
        <TextField 
          label="Nueva Contraseña" 
          type={showNew ? "text" : "password"}
          value={newPassword} 
          onChange={(e) => setNewPassword(e.target.value)} 
          required 
          InputProps={{
            endAdornment: (
              <InputAdornment position="end">
                <IconButton onClick={() => setShowNew((prev) => !prev)} edge="end">
                  {showNew ? <VisibilityOff /> : <Visibility />}
                </IconButton>
              </InputAdornment>
            ),
          }}
        />
        <TextField 
          label="Confirmar Nueva Contraseña" 
          type={showConfirm ? "text" : "password"}
          value={confirmPassword} 
          onChange={(e) => setConfirmPassword(e.target.value)} 
          required 
          InputProps={{
            endAdornment: (
              <InputAdornment position="end">
                <IconButton onClick={() => setShowConfirm((prev) => !prev)} edge="end">
                  {showConfirm ? <VisibilityOff /> : <Visibility />}
                </IconButton>
              </InputAdornment>
            ),
          }}
        />
        <Button type="submit" variant="contained" color="primary">
          Cambiar Contraseña
        </Button>
      </Box>
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
  );
}
