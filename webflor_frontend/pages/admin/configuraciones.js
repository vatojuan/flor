import React, { useState, useEffect } from "react";
import {
  Container,
  Typography,
  FormControlLabel,
  Switch,
  Button,
  Paper,
  Box,
  Snackbar,
  Alert,
  CircularProgress,
  Divider,
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Chip,
} from "@mui/material";
import TimerIcon from "@mui/icons-material/Timer";
import DashboardLayout from "../../components/DashboardLayout";
import useAdminAuth from "../../hooks/useAdminAuth";

const BASE = process.env.NEXT_PUBLIC_API_URL;
// --- CORRECCIÓN: Añadir la barra (/) al final de los endpoints ---
const CONFIG_ENDPOINT = `${BASE}/api/admin/config/`; 
const REGENERATE_ENDPOINT = `${BASE}/cv/regenerate-all-profiles/`;

export default function Configuraciones({ toggleDarkMode, currentMode }) {
  const { user, loading } = useAdminAuth();
  const [config, setConfig] = useState({
    show_expired_admin_offers: false,
    show_expired_employer_offers: false
  });
  const [isRegenerating, setIsRegenerating] = useState(false);
  const [snackbar, setSnackbar] = useState({ open: false, message: "", severity: "success" });

  // Cron config
  const [cronEnabled, setCronEnabled] = useState(true);
  const [cronInterval, setCronInterval] = useState(30);

  // Este helper ya no es estrictamente necesario si siempre usamos la barra, pero lo dejamos como una buena práctica defensiva.
  async function fetchWithFallback(path, opts) {
    try {
        let res = await fetch(path, opts);
        // Si la respuesta es una redirección, el navegador la sigue automáticamente.
        // Si falla por otra razón, el catch lo manejará.
        if (!res.ok) {
            // No intentar con barra extra si ya la tiene.
            if (res.status === 404 && !path.endsWith('/')) {
                console.log(`Intento fallido a ${path}, reintentando con /`);
                res = await fetch(path + '/', opts);
            }
        }
        return res;
    } catch (error) {
        console.error("Error en fetchWithFallback:", error);
        throw error; // relanzar el error para que sea capturado por el .catch() de la llamada
    }
  }

  /* ──── Obtener configuración ──── */
  useEffect(() => {
    if (loading || !user) return;
    const token = localStorage.getItem("adminToken");
    if (!token) {
      setSnackbar({ open: true, message: "No autorizado", severity: "error" });
      return;
    }
    const opts = { headers: { Authorization: `Bearer ${token}` } };

    fetchWithFallback(CONFIG_ENDPOINT, opts)
      .then(res => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json();
      })
      .then(data => {
        setConfig({
          show_expired_admin_offers: data.show_expired_admin_offers === true || data.show_expired_admin_offers === "true",
          show_expired_employer_offers: data.show_expired_employer_offers === true || data.show_expired_employer_offers === "true"
        });
      })
      .catch(() => {});

    // Load cron config
    fetch(`${BASE}/api/inbox/cron-config`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json())
      .then(data => {
        setCronEnabled(data.enabled);
        setCronInterval(data.interval_minutes);
      })
      .catch(() => {});
  }, [loading, user]);

  /* ──── Handlers ──── */
  const toggleKey = key => {
    setConfig(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const save = () => {
    const token = localStorage.getItem("adminToken");
    if (!token) {
      setSnackbar({ open: true, message: "No autorizado", severity: "error" });
      return;
    }
    const opts = {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify({ settings: config })
    };

    fetchWithFallback(CONFIG_ENDPOINT, opts)
      .then(res => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        setSnackbar({ open: true, message: "Configuración guardada", severity: "success" });
      })
      .catch(err => {
        console.error("Error guardando config:", err);
        setSnackbar({ open: true, message: "Error al guardar", severity: "error" });
      });
  };

  const handleRegenerateProfiles = async () => {
    const token = localStorage.getItem("adminToken");
    if (!token) {
      setSnackbar({ open: true, message: "No autorizado", severity: "error" });
      return;
    }

    setIsRegenerating(true);
    setSnackbar({ open: true, message: "Iniciando proceso...", severity: "info" });

    try {
      const res = await fetchWithFallback(REGENERATE_ENDPOINT, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` }
      });

      if (!res.ok) {
        throw new Error(`Error del servidor: ${res.status}`);
      }

      const result = await res.json();
      setSnackbar({ open: true, message: result.message || "Proceso iniciado correctamente.", severity: "success" });

    } catch (error) {
      console.error("Error al iniciar la regeneración:", error);
      setSnackbar({ open: true, message: "Error al iniciar el proceso. Intente de nuevo.", severity: "error" });
    } finally {
      setIsRegenerating(false);
    }
  };


  if (loading) return <Typography align="center" sx={{ mt: 4 }}>Cargando…</Typography>;
  if (!user) return null;

  return (
    <DashboardLayout toggleDarkMode={toggleDarkMode} currentMode={currentMode}>
      <Container sx={{ mt: 4, mb: 4 }}>
        <Typography variant="h4" gutterBottom>Configuraciones Generales</Typography>
        <Paper sx={{ p: 3, mt: 2 }}>
          <FormControlLabel
            control={
              <Switch
                checked={config.show_expired_admin_offers}
                onChange={() => toggleKey("show_expired_admin_offers")}
              />
            }
            label="Mostrar ofertas expiradas del administrador"
          />
          <FormControlLabel
            control={
              <Switch
                checked={config.show_expired_employer_offers}
                onChange={() => toggleKey("show_expired_employer_offers")}
              />
            }
            label="Mostrar ofertas expiradas de empleadores"
          />
          <Box sx={{ mt: 2 }}>
            <Button variant="contained" onClick={save}>
              Guardar cambios
            </Button>
          </Box>
        </Paper>

        <Typography variant="h4" gutterBottom sx={{ mt: 5 }}>
          Acciones de Mantenimiento
        </Typography>
        <Paper sx={{ p: 3, mt: 2 }}>
          <Typography variant="h6">Regeneración de Perfiles</Typography>
          <Typography variant="body2" color="text.secondary" sx={{mb: 2}}>
            Este proceso actualizará todos los perfiles de usuario existentes utilizando la última
            lógica de inteligencia artificial para la descripción y extracción de datos del CV.
            La tarea se ejecuta en segundo plano.
          </Typography>
          <Button 
            variant="contained" 
            color="secondary"
            onClick={handleRegenerateProfiles}
            disabled={isRegenerating}
            startIcon={isRegenerating ? <CircularProgress size={20} color="inherit" /> : null}
          >
            {isRegenerating ? "Procesando..." : "Regenerar Perfiles de Usuarios"}
          </Button>
        </Paper>

        <Typography variant="h4" gutterBottom sx={{ mt: 5 }}>
          <TimerIcon sx={{ mr: 1, verticalAlign: "middle" }} />
          Escaneo Automatico de Bandejas
        </Typography>
        <Paper sx={{ p: 3, mt: 2 }}>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            El sistema puede escanear automaticamente las bandejas de entrada configuradas
            para procesar nuevos CVs y clasificar emails.
          </Typography>

          <Box sx={{ display: "flex", alignItems: "center", gap: 3, flexWrap: "wrap" }}>
            <FormControlLabel
              control={<Switch checked={cronEnabled} onChange={(e) => setCronEnabled(e.target.checked)} />}
              label={cronEnabled ? "Activado" : "Desactivado"}
            />

            <FormControl size="small" sx={{ minWidth: 180 }}>
              <InputLabel>Intervalo</InputLabel>
              <Select value={cronInterval} label="Intervalo" onChange={(e) => setCronInterval(e.target.value)}
                disabled={!cronEnabled}>
                <MenuItem value={10}>Cada 10 minutos</MenuItem>
                <MenuItem value={15}>Cada 15 minutos</MenuItem>
                <MenuItem value={30}>Cada 30 minutos</MenuItem>
                <MenuItem value={60}>Cada 1 hora</MenuItem>
                <MenuItem value={120}>Cada 2 horas</MenuItem>
              </Select>
            </FormControl>

            <Button variant="contained" onClick={() => {
              const token = localStorage.getItem("adminToken");
              fetch(`${BASE}/api/inbox/cron-config`, {
                method: "POST",
                headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
                body: JSON.stringify({ enabled: cronEnabled, interval_minutes: cronInterval }),
              })
                .then(r => r.json())
                .then(data => setSnackbar({ open: true, message: data.message, severity: "success" }))
                .catch(() => setSnackbar({ open: true, message: "Error guardando", severity: "error" }));
            }}>
              Guardar
            </Button>

            <Chip
              label={cronEnabled ? `Escaneando cada ${cronInterval} min` : "Desactivado"}
              color={cronEnabled ? "success" : "default"}
              variant="outlined"
            />
          </Box>
        </Paper>

      </Container>

      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={() => setSnackbar(s => ({ ...s, open: false }))}
        anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
      >
        <Alert severity={snackbar.severity} sx={{ width: '100%' }}>{snackbar.message}</Alert>
      </Snackbar>
    </DashboardLayout>
  );
}

export async function getServerSideProps() {
  return { props: {} };
}
