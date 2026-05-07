// pages/job-list.js
import { useEffect, useState, useCallback, useMemo } from "react";
import Link from "next/link";
import {
  Grid,
  Typography,
  Button,
  Box,
  Snackbar,
  Alert,
  CircularProgress,
  TextField,
  MenuItem,
  Select,
  FormControl,
  InputLabel,
  InputAdornment,
  Stack,
} from "@mui/material";
import SearchIcon from "@mui/icons-material/Search";
import useAuthUser from "../hooks/useAuthUser";
import useSnackbar from "../hooks/useSnackbar";
import DashboardLayout from "../components/DashboardLayout";
import JobCard from "../components/ui/JobCard";
import ConfirmDialog from "../components/ui/ConfirmDialog";
import PageHeader from "../components/ui/PageHeader";

const API_BASE =
  process.env.NEXT_PUBLIC_API_URL || "https://api.fapmendoza.online";

export default function JobList() {
  /* ---- Auth ---- */
  const {
    user,
    role: userRole,
    token: sessionToken,
    ready,
    authHeader: getNextAuthHeader,
  } = useAuthUser();
  const userId = user?.id || null;

  /* ---- localStorage token fallback ---- */
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

  /* ---- State ---- */
  const [jobs, setJobs] = useState([]);
  const [applications, setApplications] = useState([]);
  const [loadingJobs, setLoadingJobs] = useState(true);
  const [loadingApps, setLoadingApps] = useState(false);
  const { snackbar, showSnackbar, closeSnackbar } = useSnackbar();

  const [dialogs, setDialogs] = useState({
    delete: { open: false, jobId: null },
    cancel: { open: false, jobId: null },
  });

  /* ---- Search / filter state ---- */
  const [searchQuery, setSearchQuery] = useState("");
  const [rubroFilter, setRubroFilter] = useState("");

  /* ---- Derived: unique rubros for filter dropdown ---- */
  const rubros = useMemo(() => {
    const set = new Set(jobs.map((j) => j.rubro).filter(Boolean));
    return Array.from(set).sort();
  }, [jobs]);

  /* ---- Filtered jobs ---- */
  const filteredJobs = useMemo(() => {
    let result = jobs;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter((j) => j.title?.toLowerCase().includes(q));
    }
    if (rubroFilter) {
      result = result.filter((j) => j.rubro === rubroFilter);
    }
    return result;
  }, [jobs, searchQuery, rubroFilter]);

  /* ---- Fetch jobs ---- */
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
      } catch {
        showSnackbar("Error cargando ofertas", "error");
      } finally {
        setLoadingJobs(false);
      }
    };

    fetchJobs();
  }, [ready, userRole, userId]);

  /* ---- Fetch applications (empleado) ---- */
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
      } catch {
        showSnackbar("Error cargando tus postulaciones", "error");
      } finally {
        setLoadingApps(false);
      }
    };

    fetchApps();
  }, [ready, userRole, authToken, authHeader]);

  /* ---- Helpers ---- */
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

  /* ---- Apply ---- */
  const handleApply = async (jobId) => {
    if (!authToken) {
      showSnackbar("Debes iniciar sesion para postular", "error");
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
      showSnackbar("Has postulado exitosamente", "success");

      const appsRes = await fetch(`${API_BASE}/api/job/my-applications`, {
        headers: { "Content-Type": "application/json", ...authHeader() },
      });
      if (appsRes.ok) {
        const { applications: apps } = await appsRes.json();
        setApplications(apps);
      }
    } catch {
      showSnackbar("Error al postular", "error");
    }
  };

  /* ---- Cancel application ---- */
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
      showSnackbar("Postulacion cancelada", "success");
    } catch {
      showSnackbar("Error al cancelar", "error");
    } finally {
      setDialogs((d) => ({ ...d, cancel: { open: false, jobId: null } }));
    }
  };

  /* ---- Delete job (empleador) ---- */
  const confirmDelete = async () => {
    const id = dialogs.delete.jobId;
    if (!authToken) {
      showSnackbar("No autorizado", "error");
      setDialogs((d) => ({ ...d, delete: { open: false, jobId: null } }));
      return;
    }
    try {
      const res = await fetch(`${API_BASE}/api/job/delete/${id}`, {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
          ...authHeader(),
        },
      });
      if (!res.ok) throw new Error(res.status);
      setJobs((prev) => prev.filter((j) => j.id !== id));
      showSnackbar("Oferta eliminada", "success");
    } catch {
      showSnackbar("Error al eliminar", "error");
    } finally {
      setDialogs((d) => ({ ...d, delete: { open: false, jobId: null } }));
    }
  };

  /* ---- Loading ---- */
  if (!ready) {
    return (
      <Box sx={{ display: "flex", justifyContent: "center", mt: 8 }}>
        <CircularProgress />
      </Box>
    );
  }

  /* ---- Render ---- */
  return (
    <DashboardLayout>
      <Box sx={{ px: 2 }}>
        <PageHeader
          title="Listado de Ofertas"
          subtitle={
            userRole === "empleador"
              ? "Gestiona tus ofertas publicadas"
              : "Encuentra tu proximo empleo"
          }
          actions={
            <Button component={Link} href="/dashboard" variant="outlined">
              Volver al Dashboard
            </Button>
          }
        />

        {/* Search and filter bar */}
        <Stack
          direction={{ xs: "column", sm: "row" }}
          spacing={2}
          sx={{ maxWidth: 900, mx: "auto", mb: 3 }}
        >
          <TextField
            placeholder="Buscar por titulo..."
            size="small"
            fullWidth
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon />
                </InputAdornment>
              ),
            }}
          />
          <FormControl size="small" sx={{ minWidth: 200 }}>
            <InputLabel>Rubro</InputLabel>
            <Select
              value={rubroFilter}
              label="Rubro"
              onChange={(e) => setRubroFilter(e.target.value)}
            >
              <MenuItem value="">Todos</MenuItem>
              {rubros.map((r) => (
                <MenuItem key={r} value={r}>
                  {r}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </Stack>

        {/* Job grid */}
        {loadingJobs ? (
          <Box sx={{ display: "flex", justifyContent: "center", mt: 4 }}>
            <CircularProgress />
          </Box>
        ) : filteredJobs.length === 0 ? (
          <Typography sx={{ textAlign: "center", mt: 4 }} color="text.secondary">
            {jobs.length === 0
              ? "No hay ofertas publicadas."
              : "No se encontraron ofertas con esos filtros."}
          </Typography>
        ) : (
          <Grid
            container
            spacing={3}
            sx={{ maxWidth: 960, mx: "auto" }}
          >
            {filteredJobs.map((job) => {
              const app = getApplicationForJob(job.id);
              const isCancelable =
                app &&
                ((app.label === "automatic" && app.status === "waiting") ||
                  (app.label === "manual" && app.status === "pending"));

              return (
                <Grid item xs={12} sm={6} md={4} key={job.id}>
                  <JobCard
                    job={job}
                    actions={
                      <>
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
                            color="error"
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
                            Cancelar
                          </Button>
                        ) : (
                          <Button size="small" variant="outlined" disabled>
                            Propuesta enviada
                          </Button>
                        )}
                      </>
                    }
                  />
                </Grid>
              );
            })}
          </Grid>
        )}
      </Box>

      {/* Cancel application dialog */}
      <ConfirmDialog
        open={dialogs.cancel.open}
        title="Confirmar Cancelacion"
        message="Deseas cancelar tu postulacion a este empleo?"
        confirmLabel="Confirmar"
        cancelLabel="Volver"
        onConfirm={confirmCancel}
        onCancel={() =>
          setDialogs((d) => ({ ...d, cancel: { open: false, jobId: null } }))
        }
      />

      {/* Delete job dialog */}
      <ConfirmDialog
        open={dialogs.delete.open}
        title="Confirmar Eliminacion"
        message="Seguro que deseas eliminar esta oferta?"
        confirmLabel="Eliminar"
        cancelLabel="Volver"
        severity="error"
        onConfirm={confirmDelete}
        onCancel={() =>
          setDialogs((d) => ({ ...d, delete: { open: false, jobId: null } }))
        }
      />

      {/* Snackbar */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={4000}
        onClose={closeSnackbar}
        anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
      >
        <Alert
          onClose={closeSnackbar}
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
