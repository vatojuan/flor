// pages/admin/matchins.js
import React, { useEffect, useState } from "react";
import {
  Container,
  Typography,
  Snackbar,
  Alert,
  Chip,
  Box,
  CircularProgress,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
} from "@mui/material";
import DashboardLayout from "../../components/DashboardLayout";
import useAdminAuth from "../../hooks/useAdminAuth";

const API = process.env.NEXT_PUBLIC_API_URL;

export default function Matchins() {
  useAdminAuth();

  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [snack, setSnack] = useState({ open: false, msg: "", sev: "success" });

  const getAuthHeader = () => {
    const token = localStorage.getItem("adminToken");
    return token ? { Authorization: `Bearer ${token}` } : {};
  };

  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API}/api/match/admin`, {
        headers: {
          "Content-Type": "application/json",
          ...getAuthHeader(),
        },
      });
      if (!res.ok) throw new Error("Error al cargar datos");
      const data = await res.json();

      // Ya en el backend devolvemos únicamente score ≥ 0.80,
      // así que aquí no hace falta filtrar nada. Mapeamos directamente:
      const mapped = data.map((m) => ({
        id: m.id,
        jobTitle: m.job.title,
        userEmail: m.user.email,
        score: (m.score * 100).toFixed(1) + " %",
        sentAt: m.sent_at ? new Date(m.sent_at).toLocaleString("es-AR") : "—",
        status: m.status,
        jobId: m.job.id,
      }));
      setRows(mapped);
    } catch (e) {
      console.error(e);
      setSnack({ open: true, msg: "Error cargando matchings", sev: "error" });
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchData();
  }, []);

  const resendEmail = async (matchId) => {
    try {
      const res = await fetch(`${API}/api/match/resend/${matchId}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...getAuthHeader(),
        },
      });
      if (res.ok) {
        setSnack({ open: true, msg: "Email reenviado", sev: "success" });
      } else {
        const err = await res.json();
        console.error("Error reenviar:", err);
        throw new Error();
      }
    } catch {
      setSnack({ open: true, msg: "Error al reenviar", sev: "error" });
    }
  };

  return (
    <DashboardLayout>
      <Container maxWidth="lg" sx={{ mt: 3 }}>
        <Typography variant="h4" gutterBottom>
          Matchings
        </Typography>

        {loading ? (
          <Box sx={{ display: "flex", justifyContent: "center", mt: 4 }}>
            <CircularProgress />
          </Box>
        ) : (
          <TableContainer component={Paper} sx={{ mt: 2 }}>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Oferta</TableCell>
                  <TableCell>Empleado</TableCell>
                  <TableCell>Score</TableCell>
                  <TableCell>Enviado</TableCell>
                  <TableCell>Estado</TableCell>
                  <TableCell>Acciones</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {rows.map((row) => (
                  <TableRow key={row.id}>
                    <TableCell>{row.jobTitle}</TableCell>
                    <TableCell>{row.userEmail}</TableCell>
                    <TableCell>
                      <Chip
                        label={row.score}
                        color={
                          Number(row.score.replace(" %", "")) >= 85
                            ? "success"
                            : "default"
                        }
                        size="small"
                      />
                    </TableCell>
                    <TableCell>{row.sentAt}</TableCell>
                    <TableCell>{row.status}</TableCell>
                    <TableCell>
                      <Box sx={{ display: "flex", gap: 1 }}>
                        <Button
                          size="small"
                          variant="outlined"
                          onClick={() =>
                            window.open(`/admin/mis_ofertas`, "_blank")
                          }
                        >
                          Ver oferta
                        </Button>
                        <Button
                          size="small"
                          variant="contained"
                          onClick={() => resendEmail(row.id)}
                        >
                          Reenviar
                        </Button>
                      </Box>
                    </TableCell>
                  </TableRow>
                ))}
                {rows.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={6} align="center">
                      No hay matchings registrados.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </Container>

      <Snackbar
        open={snack.open}
        autoHideDuration={4000}
        onClose={() => setSnack({ ...snack, open: false })}
        anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
      >
        <Alert
          onClose={() => setSnack({ ...snack, open: false })}
          severity={snack.sev}
          variant="filled"
          sx={{
            width: "100%",
            bgcolor:
              snack.sev === "success"
                ? (theme) => theme.palette.secondary.main
                : (theme) => theme.palette.error.main,
            color: "#fff",
          }}
        >
          {snack.msg}
        </Alert>
      </Snackbar>
    </DashboardLayout>
  );
}
