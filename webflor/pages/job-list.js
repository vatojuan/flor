// pages/job-list.js
import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import {
  Grid,
  Card,
  CardContent,
  CardActions,
  Typography,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Box,
  Divider,
  Snackbar,
  Alert,
  CircularProgress,
} from "@mui/material";
import PersonIcon from "@mui/icons-material/Person";
import useAuthUser from "../hooks/useAuthUser";
import DashboardLayout from "../components/DashboardLayout";

const API_BASE =
  process.env.NEXT_PUBLIC_API_URL || "https://api.fapmendoza.online";

export default function JobList() {
  /* ─── 1. Auth centralizada ─── */
  const {
    user,
    role: userRole,
    token: sessionToken,
    ready,
    authHeader: getNextAuthHeader,
  } = useAuthUser();
  const userId = user?.id || null;

  /* ─── 1 b. token localStorage ─── */
  const [localToken, setLocalToken] = useState(null);
  useEffect(() => {
    if (typeof window === "undefined") return;
    const t = localStorage.getItem("userToken");
    if (t) setLocalToken(t);
  }, []);

  const authToken = sessionToken || localToken;
  const authHeader = useCallback(
    () => (authToken ? { Authorization: `Bearer ${authToken}` } : {}),
    [authToken]
  );

  /* ─── 2. State ─── */
  const [jobs, setJobs] = useState([]);
  const [applications, setApplications] = useState([]);
  const [loadingJobs, setLoadingJobs] = useState(true);
  const [loadingApps, setLoadingApps] = useState(false);
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: "",
    severity: "success",
  });
  const [dialogs, setDialogs] = useState({
    delete: { open: false, jobId: null },
    cancel: { open: false, jobId: null },
  });

  /* ─── 3. Fetch ofertas ─── */
  useEffect(() => {
    if (!ready) return;

    const fetchJobs = async () => {
      setLoadingJobs(true);
      try {
        let url = `${API_BASE}/api/job/`;
        if (userRole === "empleador" && userId) url += `?userId=${userId}`;

        const res = await fetch(url, {
          headers: { "Content-Type": "application/json" },
        });
        if (!res.ok) throw new Error(`Status ${res.status}`);

        const { offers } = await res.json();
        const now = new Date();
        setJobs(
          offers.filter(
            (j) => !j.expirationDate || new Date(j.expirationDate) > now
          )
        );
      } catch (err) {
        console.error("[JobList] fetchJobs:", err);
        setSnackbar({
          open: true,
          message: "Error cargando ofertas",
          severity: "error",
        });
      } finally {
        setLoadingJobs(false);
      }
    };

    fetchJobs();
  }, [ready, userRole, userId]);

  /* ─── 4. Fetch postulaciones (empleado) ─── */
  useEffect(() => {
    if (!ready) return;
    if (userRole !== "empleado" || !authToken) {
      setApplications([]);
      return;
    }

    const fetchApps = async () => {
      setLoadingApps(true);
      try {
        const res = await fetch(`${API_BASE}/api/job/my-applications`, {
          headers: { "Content-Type": "application/json", ...authHeader() },
        });

        if (res.status === 401) {
          localStorage.removeItem("userToken");
          setLocalToken(null);
          setApplications([]);
        } else if (res.ok) {
          const { applications: apps } = await res.json();
          setApplications(apps);
        }
      } catch (err) {
        console.error("[JobList] fetchApps:", err);
        setSnackbar({
          open: true,
          message: "Error cargando tus postulaciones",
          severity: "error",
        });
      } finally {
        setLoadingApps(false);
      }
    };

    fetchApps();
  }, [ready, userRole, authToken, authHeader]);

  /* ─── 5. Helpers ─── */
  const getApplicationForJob = (jobId) =>
    applications.find((a) => a.job.id === jobId);

  const bumpCount = (jobId, delta) =>
    setJobs((prev) =>
      prev.map((j) =>
        j.id === jobId
          ? { ...j, candidatesCount: (j.candidatesCount || 0) + delta }
          : j
      )
    );

  /* ─── 6. Postular ─── */
  const handleApply = async (jobId) => {
    if (!authToken) {
      setSnackbar({
        open: true,
        message: "Debes iniciar sesión para postular",
        severity: "error",
      });
      return;
    }
    try {
      const res = await fetch(`${API_BASE}/api/job/apply`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...authHeader() },
        body: JSON.stringify({ jobId }),
      });
      if (!res.ok) throw new Error((await res.json()).detail || res.status);
      bumpCount(jobId, 1);
      setSnackbar({
        open: true,
        message: "Has postulado exitosamente",
        severity: "success",
      });

      const appsRes = await fetch(`${API_BASE}/api/job/my-applications`, {
        headers: { "Content-Type": "application/json", ...authHeader() },
      });
      if (appsRes.ok) {
        const { applications: apps } = await appsRes.json();
        setApplications(apps);
      }
    } catch (err) {
      console.error("[JobList] apply:", err);
      setSnackbar({
        open: true,
        message: "Error al postular",
        severity: "error",
      });
    }
  };

  /* ─── 7. Cancelar postulación ─── */
  const confirmCancel = async () => {
    const id = dialogs.cancel.jobId;
    try {
      const res = await fetch(`${API_BASE}/api/job/cancel-application`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json", ...authHeader() },
        body: JSON.stringify({ jobId: id }),
      });
      if (!res.ok) throw new Error(res.status);
      bumpCount(id, -1);
      setApplications((apps) => apps.filter((a) => a.job.id !== id));
      setSnackbar({
        open: true,
        message: "Postulación cancelada",
        severity: "success",
      });
    } catch (err) {
      console.error("[JobList] cancel:", err);
      setSnackbar({
        open: true,
        message: "Error al cancelar",
        severity: "error",
      });
    } finally {
      setDialogs((d) => ({ ...d, cancel: { open: false, jobId: null } }));
    }
  };

  /* ─── 8. Eliminar oferta (empleador) ─── */
  const confirmDelete = async () => {
    const id = dialogs.delete.jobId;
    if (!authToken) {
      setSnackbar({
        open: true,
        message: "No autorizado",
        severity: "error",
      });
      setDialogs((d) => ({ ...d, delete: { open: false, jobId: null } }));
      return;
    }
    try {
      const res = await fetch(`${API_BASE}/api/job/delete/${id}`, {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
          ...authHeader(), // ✅ Usa el token del usuario empleador
        },
      });
      if (!res.ok) throw new Error(res.status);
      setJobs((prev) => prev.filter((j) => j.id !== id));
      setSnackbar({
        open: true,
        message: "Oferta eliminada",
        severity: "success",
      });
    } catch (err) {
      console.error("[JobList] delete:", err);
      setSnackbar({
        open: true,
        message: "Error al eliminar",
        severity: "error",
      });
    } finally {
      setDialogs((d) => ({ ...d, delete: { open: false, jobId: null } }));
    }
  };

  /* ─── 9. Loader global ─── */
  if (!ready) {
    return (
      <Box sx={{ display: "flex", justifyContent: "center", mt: 8 }}>
        <CircularProgress />
      </Box>
    );
  }

  /* ─── 10. Render ─── */
  return (
    <DashboardLayout>
      <Box sx={{ textAlign: "center", mt: 4, px: 2 }}>
        <Typography variant="h4" gutterBottom>
          Listado de Ofertas
        </Typography>

        {loadingJobs ? (
          <Box sx={{ display: "flex", justifyContent: "center", mt: 4 }}>
            <CircularProgress />
          </Box>
        ) : jobs.length === 0 ? (
          <Typography>No hay ofertas publicadas.</Typography>
        ) : (
          <Grid
            container
            spacing={3}
            sx={{ mx: "auto", width: { md: "900px" } }}
          >
            {jobs.map((job) => {
              const app = getApplicationForJob(job.id);
              const isCancelable =
                app &&
                ((app.label === "automatic" && app.status === "waiting") ||
                  (app.label === "manual" && app.status === "pending"));

              /* Fecha de publicación: primer campo existente */
              const publishedAt =
                job.createdAt || job.created_at || job.jobPostedAt || null;

              return (
                <Grid item xs={12} sm={6} md={4} key={job.id}>
                  <Card
                    sx={{
                      display: "flex",
                      flexDirection: "column",
                      height: "100%",
                    }}
                  >
                    <CardContent sx={{ flexGrow: 1 }}>
                      <Typography variant="h6">{job.title}</Typography>

                      {publishedAt && (
                        <Typography
                          variant="body2"
                          color="text.secondary"
                          sx={{ mt: 1 }}
                        >
                          Publicado el:{" "}
                          {new Date(publishedAt).toLocaleDateString()}
                        </Typography>
                      )}

                      <Typography
                        variant="body2"
                        color="error"
                        sx={{ mt: 0.5 }}
                      >
                        Expira:{" "}
                        {job.expirationDate
                          ? new Date(job.expirationDate).toLocaleDateString()
                          : "Sin expiración"}
                      </Typography>

                      <Typography
                        variant="body2"
                        color="text.secondary"
                        sx={{
                          display: "flex",
                          alignItems: "center",
                          gap: 0.5,
                          mt: 1,
                        }}
                      >
                        Candidatos postulados: {job.candidatesCount || 0}
                        <PersonIcon fontSize="small" />
                      </Typography>
                    </CardContent>

                    <CardActions sx={{ justifyContent: "space-between", p: 2 }}>
                      <Button
                        component={Link}
                        href={`/job-offer?id=${job.id}`}
                        size="small"
                      >
                        Ver Detalles
                      </Button>

                      {userRole === "empleador" ? (
                        <Button
                          size="small"
                          variant="contained"
                          color="secondary"
                          onClick={() =>
                            setDialogs((d) => ({
                              ...d,
                              delete: { open: true, jobId: job.id },
                            }))
                          }
                        >
                          Eliminar
                        </Button>
                      ) : !app ? (
                        <Button
                          size="small"
                          variant="contained"
                          color="primary"
                          onClick={() => handleApply(job.id)}
                        >
                          Postularme
                        </Button>
                      ) : isCancelable ? (
                        <Button
                          size="small"
                          variant="contained"
                          color="secondary"
                          onClick={() =>
                            setDialogs((d) => ({
                              ...d,
                              cancel: { open: true, jobId: job.id },
                            }))
                          }
                        >
                          Cancelar Postulación
                        </Button>
                      ) : (
                        <Button size="small" variant="outlined" disabled>
                          Propuesta enviada
                        </Button>
                      )}
                    </CardActions>
                  </Card>
                </Grid>
              );
            })}
          </Grid>
        )}

        <Divider sx={{ my: 3 }} />

        <Box sx={{ textAlign: "center" }}>
          <Button component={Link} href="/dashboard" variant="contained">
            Volver al Dashboard
          </Button>
        </Box>
      </Box>

      {/* ─── Diálogo cancelar ─── */}
      <Dialog
        open={dialogs.cancel.open}
        onClose={() =>
          setDialogs((d) => ({ ...d, cancel: { open: false, jobId: null } }))
        }
      >
        <DialogTitle>Confirmar Cancelación</DialogTitle>
        <DialogContent>
          <Typography>
            ¿Deseas cancelar tu postulación a este empleo?
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button
            onClick={() =>
              setDialogs((d) => ({
                ...d,
                cancel: { open: false, jobId: null },
              }))
            }
          >
            Volver
          </Button>
          <Button
            onClick={confirmCancel}
            color="secondary"
            variant="contained"
          >
            Confirmar
          </Button>
        </DialogActions>
      </Dialog>

      {/* ─── Diálogo eliminar ─── */}
      <Dialog
        open={dialogs.delete.open}
        onClose={() =>
          setDialogs((d) => ({ ...d, delete: { open: false, jobId: null } }))
        }
      >
        <DialogTitle>Confirmar Eliminación</DialogTitle>
        <DialogContent>
          <Typography>¿Seguro que deseas eliminar esta oferta?</Typography>
        </DialogContent>
        <DialogActions>
          <Button
            onClick={() =>
              setDialogs((d) => ({
                ...d,
                delete: { open: false, jobId: null },
              }))
            }
          >
            Volver
          </Button>
          <Button
            onClick={confirmDelete}
            color="secondary"
            variant="contained"
          >
            Eliminar
          </Button>
        </DialogActions>
      </Dialog>

      {/* ─── Snackbar ─── */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={4000}
        onClose={() => setSnackbar((s) => ({ ...s, open: false }))}
        anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
      >
        <Alert
          onClose={() => setSnackbar((s) => ({ ...s, open: false }))}
          severity={snackbar.severity}
          variant="filled"
          sx={{ width: "100%" }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </DashboardLayout>
  );
}
