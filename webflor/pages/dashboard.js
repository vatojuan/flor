// pages/dashboard.js
import { useRouter } from "next/router";
import { signOut, useSession } from "next-auth/react";
import { useEffect, useState } from "react";
import Link from "next/link";
import useAuthUser from "../hooks/useAuthUser";
import useSnackbar from "../hooks/useSnackbar";
import DashboardLayout from "../components/DashboardLayout";
import JobCard from "../components/ui/JobCard";
import ConfirmDialog from "../components/ui/ConfirmDialog";
import PageHeader from "../components/ui/PageHeader";
import {
  Box,
  Paper,
  Typography,
  Button,
  Avatar,
  Grid,
  Card,
  CardActionArea,
  CardContent,
  Snackbar,
  Alert,
  CircularProgress,
  useTheme,
} from "@mui/material";
import WorkIcon from "@mui/icons-material/Work";
import AddCircleOutlineIcon from "@mui/icons-material/AddCircleOutline";
import ListAltIcon from "@mui/icons-material/ListAlt";
import PersonIcon from "@mui/icons-material/Person";
import SearchIcon from "@mui/icons-material/Search";
import LogoutIcon from "@mui/icons-material/Logout";
import AssignmentIcon from "@mui/icons-material/Assignment";
import PeopleAltIcon from "@mui/icons-material/PeopleAlt";
import StarIcon from "@mui/icons-material/Star";

const API_BASE =
  process.env.NEXT_PUBLIC_API_URL || "https://api.fapmendoza.online";

export default function Dashboard({ toggleDarkMode, currentMode }) {
  const { data: session, status: sessionStatus } = useSession();
  const router = useRouter();
  const theme = useTheme();
  const { token, authHeader } = useAuthUser();
  const { snackbar, showSnackbar, closeSnackbar } = useSnackbar();

  const userRole = session?.user?.role;

  /* ---- State ---- */
  const [applications, setApplications] = useState([]);
  const [openCancelDialog, setOpenCancelDialog] = useState(false);
  const [selectedCancelJobId, setSelectedCancelJobId] = useState(null);
  const [employerJobs, setEmployerJobs] = useState([]);

  /* ---- Route guards ---- */
  useEffect(() => {
    if (sessionStatus === "loading") return;
    if (!session) {
      router.replace("/login");
    } else if (!userRole) {
      router.replace("/select-role");
    }
  }, [session, sessionStatus, userRole, router]);

  /* ---- Fetch applications (empleado) ---- */
  useEffect(() => {
    if (sessionStatus !== "authenticated" || userRole !== "empleado" || !token) {
      setApplications([]);
      return;
    }

    const fetchApplications = async () => {
      try {
        const res = await fetch(`${API_BASE}/api/job/my-applications`, {
          headers: { "Content-Type": "application/json", ...authHeader() },
        });

        if (res.status === 401) {
          localStorage.removeItem("userToken");
          setApplications([]);
        } else if (res.ok) {
          const { applications: apps } = await res.json();
          setApplications(apps);
        }
      } catch {
        // network error — silent
      }
    };

    fetchApplications();
  }, [sessionStatus, userRole, token, authHeader]);

  /* ---- Fetch employer jobs (empleador/admin) ---- */
  useEffect(() => {
    if (sessionStatus !== "authenticated" || userRole === "empleado") return;
    const userId = session?.user?.id;
    if (!userId) return;

    const fetchEmployerJobs = async () => {
      try {
        const res = await fetch(`${API_BASE}/api/job/?userId=${userId}`, {
          headers: { "Content-Type": "application/json" },
        });
        if (res.ok) {
          const { offers } = await res.json();
          setEmployerJobs(offers || []);
        }
      } catch {
        // silent
      }
    };

    fetchEmployerJobs();
  }, [sessionStatus, userRole, session?.user?.id]);

  /* ---- Employer metrics ---- */
  const activeOffers = employerJobs.length;
  const totalApplications = employerJobs.reduce(
    (sum, j) => sum + (j.candidatesCount || 0),
    0
  );
  const featuredOffers = employerJobs.filter((j) => j.is_paid).length;

  /* ---- Cancel application ---- */
  const confirmCancelApplication = async () => {
    const jobId = selectedCancelJobId;
    try {
      const res = await fetch(`${API_BASE}/api/job/cancel-application`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json", ...authHeader() },
        body: JSON.stringify({ jobId }),
      });

      if (res.ok) {
        setApplications((prev) => prev.filter((a) => a.job.id !== jobId));
        showSnackbar("Postulacion cancelada", "success");
      } else {
        showSnackbar("Error al cancelar la postulacion", "error");
      }
    } catch {
      showSnackbar("Error al cancelar", "error");
    } finally {
      setOpenCancelDialog(false);
      setSelectedCancelJobId(null);
    }
  };

  /* ---- Sign out ---- */
  const handleSignOut = async () => {
    await signOut({ redirect: false });
    showSnackbar("Sesion cerrada", "success");
    setTimeout(() => router.push("/login"), 1200);
  };

  /* ---- Loading spinner ---- */
  if (sessionStatus === "loading" || !userRole) {
    return (
      <Box sx={{ display: "flex", justifyContent: "center", mt: 8 }}>
        <CircularProgress />
      </Box>
    );
  }

  /* ---- Employer menu items ---- */
  const empleadorMenuItems = [
    {
      label: "Publicar Oferta",
      href: "/job-create",
      icon: <AddCircleOutlineIcon sx={{ fontSize: 40 }} />,
    },
    {
      label: "Mis Ofertas",
      href: "/job-list",
      icon: <ListAltIcon sx={{ fontSize: 40 }} />,
    },
    {
      label: "Actualizar Perfil",
      href: "/profile-empleador",
      icon: <PersonIcon sx={{ fontSize: 40 }} />,
    },
    {
      label: "Buscar Personal",
      href: "/servicios/busqueda",
      icon: <SearchIcon sx={{ fontSize: 40 }} />,
    },
  ];

  /* ---- Render ---- */
  return (
    <DashboardLayout
      toggleDarkMode={toggleDarkMode}
      currentMode={currentMode}
      userRole={userRole}
    >
      {/* Avatar + welcome */}
      <Box sx={{ textAlign: "center", mt: 4 }}>
        <Avatar
          src={session?.user?.image || "/images/default-user.png"}
          sx={{
            width: 100,
            height: 100,
            border: `2px solid ${theme.palette.divider}`,
            mx: "auto",
            mb: 2,
          }}
        />
        <Typography variant="h6">
          Bienvenido, {session?.user?.name || "Usuario"}
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Tu rol: {userRole}
        </Typography>
      </Box>

      {/* ---- EMPLEADO view ---- */}
      {userRole === "empleado" && (
        <>
          <Box sx={{ mt: 3, mx: "auto", maxWidth: 500 }}>
            <Grid container spacing={2}>
              <Grid item xs={12} sm={6}>
                <Button
                  fullWidth
                  variant="contained"
                  component={Link}
                  href="/job-list"
                  startIcon={<WorkIcon />}
                >
                  Ver Ofertas
                </Button>
              </Grid>
              <Grid item xs={12} sm={6}>
                <Button
                  fullWidth
                  variant="outlined"
                  component={Link}
                  href="/profile-empleado"
                  startIcon={<PersonIcon />}
                >
                  Actualizar Perfil
                </Button>
              </Grid>
            </Grid>
          </Box>

          <Paper
            sx={{
              maxWidth: 900,
              mx: "auto",
              mt: 4,
              p: 3,
              borderRadius: 2,
            }}
          >
            <PageHeader title="Mis Postulaciones" sx={{ mt: 0, px: 0 }} />

            {applications.length === 0 ? (
              <Typography variant="body2" color="text.secondary">
                No has postulado a ningun empleo.
              </Typography>
            ) : (
              <Grid container spacing={3} justifyContent="center">
                {applications.map((app) => {
                  const { job } = app;
                  const isCancelable =
                    (app.label === "automatic" && app.status === "waiting") ||
                    (app.label === "manual" && app.status === "pending");

                  return (
                    <Grid item xs={12} sm={6} md={4} key={app.id}>
                      <JobCard
                        job={job}
                        highlighted
                        actions={
                          <>
                            <Button
                              component={Link}
                              href={`/job-offer?id=${job.id}`}
                              size="small"
                              variant="outlined"
                            >
                              Ver Detalles
                            </Button>
                            {isCancelable ? (
                              <Button
                                size="small"
                                variant="contained"
                                color="secondary"
                                onClick={() => {
                                  setSelectedCancelJobId(job.id);
                                  setOpenCancelDialog(true);
                                }}
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
          </Paper>
        </>
      )}

      {/* ---- EMPLEADOR / ADMIN view ---- */}
      {userRole !== "empleado" && (
        <Box sx={{ maxWidth: 600, mx: "auto", mt: 4, px: 2 }}>
          {/* Metrics row */}
          <Grid container spacing={2} sx={{ mb: 3 }}>
            {[
              {
                value: activeOffers,
                label: "Ofertas Activas",
                icon: <AssignmentIcon sx={{ fontSize: 28 }} />,
                color: "primary.main",
              },
              {
                value: totalApplications,
                label: "Postulaciones",
                icon: <PeopleAltIcon sx={{ fontSize: 28 }} />,
                color: "secondary.main",
              },
              {
                value: featuredOffers,
                label: "Destacadas",
                icon: <StarIcon sx={{ fontSize: 28 }} />,
                color: "warning.main",
              },
            ].map((stat) => (
              <Grid item xs={4} key={stat.label}>
                <Paper
                  elevation={1}
                  sx={{
                    p: 2,
                    textAlign: "center",
                    borderRadius: 2,
                    bgcolor: "background.paper",
                  }}
                >
                  <Box sx={{ color: stat.color, mb: 0.5 }}>{stat.icon}</Box>
                  <Typography
                    variant="h4"
                    fontWeight={700}
                    color={stat.color}
                  >
                    {stat.value}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {stat.label}
                  </Typography>
                </Paper>
              </Grid>
            ))}
          </Grid>

          <PageHeader title="Opciones de Empleador" sx={{ mt: 0 }} />
          <Grid container spacing={2}>
            {empleadorMenuItems.map((item) => (
              <Grid item xs={12} sm={4} key={item.href}>
                <Card
                  sx={{
                    textAlign: "center",
                    transition: "box-shadow 0.2s, transform 0.2s",
                    "&:hover": {
                      boxShadow: theme.shadows[4],
                      transform: "translateY(-2px)",
                    },
                  }}
                >
                  <CardActionArea component={Link} href={item.href}>
                    <CardContent>
                      <Box sx={{ color: "primary.main", mb: 1 }}>
                        {item.icon}
                      </Box>
                      <Typography variant="subtitle1" fontWeight={500}>
                        {item.label}
                      </Typography>
                    </CardContent>
                  </CardActionArea>
                </Card>
              </Grid>
            ))}
          </Grid>
        </Box>
      )}

      {/* Sign out */}
      <Box sx={{ textAlign: "center", mt: 4, mb: 2 }}>
        <Button
          onClick={handleSignOut}
          variant="contained"
          color="error"
          startIcon={<LogoutIcon />}
        >
          Cerrar sesion
        </Button>
      </Box>

      {/* Cancel dialog */}
      <ConfirmDialog
        open={openCancelDialog}
        title="Confirmar Cancelacion"
        message="Deseas cancelar tu postulacion a este empleo?"
        confirmLabel="Confirmar"
        cancelLabel="Volver"
        onConfirm={confirmCancelApplication}
        onCancel={() => setOpenCancelDialog(false)}
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
