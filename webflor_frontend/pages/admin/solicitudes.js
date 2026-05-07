import { useState, useEffect } from "react";
import {
  Box, Typography, Paper, Chip, Button, Alert,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  CircularProgress, Dialog, DialogTitle, DialogContent, DialogActions,
} from "@mui/material";
import CheckIcon from "@mui/icons-material/Check";
import SmartToyIcon from "@mui/icons-material/SmartToy";
import DashboardLayout from "../../components/DashboardLayout";
import useAdminAuth from "../../hooks/useAdminAuth";
import { useRouter } from "next/router";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "https://api.fapmendoza.online";

const STATUS_MAP = {
  pending_payment: { label: "Pendiente pago", color: "warning" },
  paid: { label: "Pagada", color: "success" },
  completed: { label: "Completada", color: "default" },
  rejected: { label: "Rechazada", color: "error" },
  outsourcing_new: { label: "Outsourcing (nuevo)", color: "info" },
  outsourcing_contacted: { label: "Outsourcing (contactado)", color: "primary" },
  outsourcing_active: { label: "Outsourcing (activo)", color: "success" },
};

export default function SolicitudesPage() {
  useAdminAuth();
  const router = useRouter();
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);
  const [result, setResult] = useState(null);

  const token = typeof window !== "undefined" ? localStorage.getItem("adminToken") : null;
  const headers = { "Content-Type": "application/json", Authorization: `Bearer ${token}` };

  const fetchRequests = async () => {
    try {
      const res = await fetch(`${API_URL}/api/services/requests`, { headers });
      const data = await res.json();
      setRequests(data);
    } catch (e) {
      setResult({ severity: "error", text: "Error cargando solicitudes" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchRequests(); }, []);

  const handleComplete = async (requestId) => {
    try {
      const res = await fetch(`${API_URL}/api/services/requests/${requestId}/complete`, {
        method: "PATCH", headers,
      });
      if (res.ok) {
        setResult({ severity: "success", text: "Solicitud marcada como completada" });
        fetchRequests();
      }
    } catch (e) {
      setResult({ severity: "error", text: "Error al completar" });
    }
    setSelected(null);
  };

  const goToAgent = (req) => {
    // Pre-fill the agent with a search query based on the request
    const query = `Busca candidatos para el puesto "${req.position}" ${req.location ? `en ${req.location}` : ""}. Requisitos: ${req.requirements}. Necesitan ${req.quantity} persona(s).`;
    localStorage.setItem("agentPreMessage", query);
    router.push("/admin/agente");
  };

  return (
    <DashboardLayout>
      <Box sx={{ p: 3 }}>
        <Typography variant="h4" sx={{ mb: 3, fontWeight: 600 }}>
          Solicitudes de Busqueda
        </Typography>

        {result && <Alert severity={result.severity} sx={{ mb: 2 }} onClose={() => setResult(null)}>{result.text}</Alert>}

        {loading ? (
          <CircularProgress />
        ) : requests.length === 0 ? (
          <Paper sx={{ p: 4, textAlign: "center" }}>
            <Typography color="text.secondary">No hay solicitudes todavia</Typography>
          </Paper>
        ) : (
          <TableContainer component={Paper} sx={{ borderRadius: 2 }}>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Empresa</TableCell>
                  <TableCell>Puesto</TableCell>
                  <TableCell>Cant.</TableCell>
                  <TableCell>Urgencia</TableCell>
                  <TableCell>Estado</TableCell>
                  <TableCell>Fecha</TableCell>
                  <TableCell>Acciones</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {requests.map((req) => {
                  const st = STATUS_MAP[req.status] || { label: req.status, color: "default" };
                  return (
                    <TableRow key={req.request_id} hover>
                      <TableCell>
                        <Typography fontWeight={600}>{req.company_name}</Typography>
                        <Typography variant="caption" color="text.secondary">{req.contact_name} — {req.contact_phone}</Typography>
                      </TableCell>
                      <TableCell>{req.position}</TableCell>
                      <TableCell>{req.quantity}</TableCell>
                      <TableCell>
                        <Chip label={req.urgency} size="small"
                          color={req.urgency === "urgente" ? "error" : req.urgency === "normal" ? "primary" : "default"} />
                      </TableCell>
                      <TableCell><Chip label={st.label} size="small" color={st.color} /></TableCell>
                      <TableCell>{new Date(req.created_at).toLocaleDateString("es-AR")}</TableCell>
                      <TableCell>
                        {(req.status === "paid" || req.status === "outsourcing_new") && (
                          <Box sx={{ display: "flex", gap: 1 }}>
                            <Button size="small" variant="contained" startIcon={<SmartToyIcon />}
                              onClick={() => goToAgent(req)}>
                              Buscar
                            </Button>
                            <Button size="small" variant="outlined" startIcon={<CheckIcon />}
                              onClick={() => setSelected(req)}>
                              {req.status === "outsourcing_new" ? "Contactado" : "Completar"}
                            </Button>
                          </Box>
                        )}
                        {req.status === "outsourcing_contacted" && (
                          <Button size="small" variant="outlined" color="success" startIcon={<CheckIcon />}
                            onClick={() => setSelected(req)}>
                            Cerrar acuerdo
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </TableContainer>
        )}

        {/* Detail/complete dialog */}
        <Dialog open={!!selected} onClose={() => setSelected(null)} maxWidth="sm" fullWidth>
          <DialogTitle>Completar solicitud</DialogTitle>
          <DialogContent>
            {selected && (
              <Box sx={{ mt: 1 }}>
                <Typography><strong>Empresa:</strong> {selected.company_name}</Typography>
                <Typography><strong>Puesto:</strong> {selected.position} (x{selected.quantity})</Typography>
                <Typography><strong>Requisitos:</strong> {selected.requirements}</Typography>
                <Typography><strong>Contacto:</strong> {selected.contact_email} — {selected.contact_phone}</Typography>
                {selected.notes && <Typography><strong>Notas:</strong> {selected.notes}</Typography>}
              </Box>
            )}
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setSelected(null)}>Cancelar</Button>
            <Button variant="contained" onClick={() => handleComplete(selected?.request_id)}>
              Marcar como completada
            </Button>
          </DialogActions>
        </Dialog>
      </Box>
    </DashboardLayout>
  );
}
