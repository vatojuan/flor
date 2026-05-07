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
import GroupsIcon from "@mui/icons-material/Groups";
import LogoutIcon from "@mui/icons-material/Logout";
import AssignmentIcon from "@mui/icons-material/Assignment";
import PeopleAltIcon from "@mui/icons-material/PeopleAlt";
import StarIcon from "@mui/icons-material/Star";
import InboxIcon from "@mui/icons-material/Inbox";

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
        <CircularProgress sx={{ color: "#D96236" }} />
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
      label: "Mis Postulaciones",
      href: "/employer/postulaciones",
      icon: <InboxIcon sx={{ fontSize: 40 }} />,
    },
    {
      label: "Buscar Personal",
      href: "/servicios/busqueda",
      icon: <SearchIcon sx={{ fontSize: 40 }} />,
    },
    {
      label: "Tercerizar Personal",
      href: "/soluciones/outsourcing#solicitar",
      icon: <GroupsIcon sx={{ fontSize: 40 }} />,
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
      <Box sx={{ textAlign: "center", mt: 4, mb: 3 }}>
        <Avatar
          src={session?.user?.image || "/images/default-user.png"}
          sx={{
            width: 110,
            height: 110,
            border: "3px solid rgba(217, 98, 54, 0.4)",
            mx: "auto",
            mb: 2,
            boxShadow: "0 4px 20px rgba(0,0,0,0.3)",
          }}
        />
        <Typography variant="h5" sx={{ color: "#FFF", fontWeight: 600 }}>
          Bienvenido, {session?.user?.name || "Usuario"}
        </Typography>
        <Typography
          variant="body1"
          sx={{
            color: "rgba(255,255,255,0.5)",
            mt: 0.5,
            textTransform: "capitalize",
          }}
        >
          {userRole}
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
                  sx={{
                    py: 1.3,
                    borderRadius: "12px",
                    backgroundColor: "#D96236",
                    fontWeight: 600,
                    "&:hover": { backgroundColor: "#B0482B", transform: "translateY(-1px)" },
                    transition: "all 0.2s ease",
                  }}
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
                  sx={{
                    py: 1.3,
                    borderRadius: "12px",
                    borderColor: "rgba(255,255,255,0.3)",
                    color: "#FFF",
                    borderWidth: "2px",
                    fontWeight: 600,
                    "&:hover": {
                      borderColor: "#D96236",
                      color: "#D96236",
                      backgroundColor: "rgba(217,98,54,0.08)",
                      borderWidth: "2px",
                      transform: "translateY(-1px)",
                    },
                    transition: "all 0.2s ease",
                  }}
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
              borderRadius: 3,
              backgroundColor: "rgba(16, 59, 64, 0.5)",
              border: "1px solid rgba(255,255,255,0.08)",
              backdropFilter: "blur(8px)",
            }}
          >
            <PageHeader title="Mis Postulaciones" sx={{ mt: 0, px: 0, "& .MuiTypography-root": { color: "#FFF" } }} />

            {applications.length === 0 ? (
              <Typography variant="body2" sx={{ color: "rgba(255,255,255,0.5)" }}>
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
        <Box sx={{ maxWidth: 700, mx: "auto", mt: 4, px: 2 }}>
          {/* Metrics row */}
          <Grid container spacing={2} sx={{ mb: 4 }}>
            {[
              {
                value: activeOffers,
                label: "Ofertas Activas",
                icon: <AssignmentIcon sx={{ fontSize: 30 }} />,
                color: "#D96236",
              },
              {
                value: totalApplications,
                label: "Postulaciones",
                icon: <PeopleAltIcon sx={{ fontSize: 30 }} />,
                color: "#26A69A",
              },
              {
                value: featuredOffers,
                label: "Destacadas",
                icon: <StarIcon sx={{ fontSize: 30 }} />,
                color: "#FFB300",
              },
            ].map((stat) => (
              <Grid item xs={4} key={stat.label}>
                <Paper
                  elevation={0}
                  sx={{
                    p: 2.5,
                    textAlign: "center",
                    borderRadius: 3,
                    backgroundColor: "rgba(16, 59, 64, 0.6)",
                    border: "1px solid rgba(255,255,255,0.08)",
                    backdropFilter: "blur(8px)",
                    transition: "all 0.25s ease",
                    "&:hover": {
                      backgroundColor: "rgba(16, 59, 64, 0.8)",
                      transform: "translateY(-2px)",
                      boxShadow: "0 8px 24px rgba(0,0,0,0.2)",
                    },
                  }}
                >
                  <Box sx={{ color: stat.color, mb: 1 }}>{stat.icon}</Box>
                  <Typography
                    variant="h3"
                    sx={{ fontWeight: 700, color: stat.color, lineHeight: 1 }}
                  >
                    {stat.value}
                  </Typography>
                  <Typography
                    variant="caption"
                    sx={{ color: "rgba(255,255,255,0.5)", fontSize: "0.8rem" }}
                  >
                    {stat.label}
                  </Typography>
                </Paper>
              </Grid>
            ))}
          </Grid>

          <PageHeader
            title="Opciones de Empleador"
            sx={{ mt: 0, "& .MuiTypography-root": { color: "#FFF" } }}
          />
          <Grid container spacing={2}>
            {empleadorMenuItems.map((item) => (
              <Grid item xs={6} sm={4} key={item.href}>
                <Card
                  sx={{
                    textAlign: "center",
                    borderRadius: 3,
                    backgroundColor: "rgba(16, 59, 64, 0.5)",
                    border: "1px solid rgba(255,255,255,0.08)",
                    transition: "all 0.25s ease",
                    "&:hover": {
                      backgroundColor: "rgba(217, 98, 54, 0.15)",
                      borderColor: "rgba(217, 98, 54, 0.3)",
                      transform: "translateY(-3px)",
                      boxShadow: "0 8px 24px rgba(0,0,0,0.25)",
                    },
                  }}
                >
                  <CardActionArea
                    component={Link}
                    href={item.href}
                    sx={{ py: 1 }}
                  >
                    <CardContent>
                      <Box
                        sx={{
                          color: "#D96236",
                          mb: 1.5,
                          transition: "transform 0.2s ease",
                          ".MuiCardActionArea-root:hover &": { transform: "scale(1.1)" },
                        }}
                      >
                        {item.icon}
                      </Box>
                      <Typography
                        variant="subtitle2"
                        sx={{ fontWeight: 600, color: "#FFF", fontSize: "0.9rem" }}
                      >
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
      <Box sx={{ textAlign: "center", mt: 5, mb: 3 }}>
        <Button
          onClick={handleSignOut}
          variant="outlined"
          startIcon={<LogoutIcon />}
          sx={{
            borderRadius: "24px",
            px: 3,
            py: 1,
            borderColor: "rgba(255,255,255,0.2)",
            color: "rgba(255,255,255,0.6)",
            fontWeight: 600,
            transition: "all 0.2s ease",
            "&:hover": {
              borderColor: "#ef5350",
              color: "#ef5350",
              backgroundColor: "rgba(239, 83, 80, 0.08)",
            },
          }}
        >
          Cerrar sesión
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
