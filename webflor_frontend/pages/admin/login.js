import { useState } from "react";
import { useRouter } from "next/router";
import Image from "next/image";
import {
  Box, Container, Typography, TextField, Button, Alert, Paper,
  CircularProgress,
} from "@mui/material";
import LockOutlinedIcon from "@mui/icons-material/LockOutlined";

export default function AdminLogin() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const API_URL = process.env.NEXT_PUBLIC_API_URL || "https://api.fapmendoza.online";
      const res = await fetch(`${API_URL}/auth/admin-login`, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({ username: email, password }),
      });
      const data = await res.json();
      if (res.ok) {
        localStorage.setItem("adminToken", data.access_token);
        router.push("/admin/dashboard");
      } else {
        setError(data.detail || "Credenciales incorrectas");
      }
    } catch {
      setError("Error de conexión. Intenta de nuevo.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box
      sx={{
        minHeight: "100vh",
        background: "linear-gradient(135deg, #0B2A2D 0%, #103B40 40%, #155158 100%)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        p: 2,
      }}
    >
      <Container maxWidth="xs">
        <Paper
          elevation={0}
          sx={{
            p: { xs: 3, sm: 4 },
            borderRadius: 3,
            backgroundColor: "rgba(255,255,255,0.06)",
            backdropFilter: "blur(16px)",
            border: "1px solid rgba(255,255,255,0.1)",
            textAlign: "center",
          }}
        >
          {/* Logo */}
          <Box sx={{ mb: 3 }}>
            <Image
              src="/images/Fap rrhh circular-marca-naranja(chico).png"
              alt="FAP RRHH"
              width={80}
              height={80}
              priority
            />
          </Box>

          <Typography variant="h5" sx={{ color: "#FFF", fontWeight: 700, mb: 0.5 }}>
            Panel Administrativo
          </Typography>
          <Typography variant="body2" sx={{ color: "rgba(255,255,255,0.5)", mb: 3 }}>
            Ingresa tus credenciales para continuar
          </Typography>

          {error && (
            <Alert severity="error" sx={{ mb: 2, borderRadius: 2 }}>
              {error}
            </Alert>
          )}

          <Box
            component="form"
            onSubmit={handleSubmit}
            sx={{
              display: "flex",
              flexDirection: "column",
              gap: 2.5,
              "& .MuiTextField-root": {
                "& .MuiOutlinedInput-root": {
                  color: "#FFF",
                  borderRadius: "12px",
                  "& fieldset": { borderColor: "rgba(255,255,255,0.2)" },
                  "&:hover fieldset": { borderColor: "rgba(255,255,255,0.4)" },
                  "&.Mui-focused fieldset": { borderColor: "#D96236" },
                },
                "& .MuiInputLabel-root": { color: "rgba(255,255,255,0.5)" },
                "& .MuiInputLabel-root.Mui-focused": { color: "#D96236" },
              },
            }}
          >
            <TextField
              label="Email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              fullWidth
              autoComplete="email"
              autoFocus
            />
            <TextField
              label="Contraseña"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              fullWidth
              autoComplete="current-password"
            />
            <Button
              type="submit"
              variant="contained"
              size="large"
              disabled={loading}
              startIcon={loading ? <CircularProgress size={20} color="inherit" /> : <LockOutlinedIcon />}
              sx={{
                py: 1.4,
                borderRadius: "12px",
                backgroundColor: "#D96236",
                fontWeight: 600,
                fontSize: "1rem",
                textTransform: "none",
                "&:hover": { backgroundColor: "#B0482B" },
              }}
            >
              {loading ? "Ingresando..." : "Ingresar"}
            </Button>
          </Box>
        </Paper>

        <Typography
          variant="caption"
          sx={{ display: "block", textAlign: "center", mt: 3, color: "rgba(255,255,255,0.3)" }}
        >
          © {new Date().getFullYear()} FAP Mendoza — Acceso restringido
        </Typography>
      </Container>
    </Box>
  );
}
