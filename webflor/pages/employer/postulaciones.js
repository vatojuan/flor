import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import { useSession } from "next-auth/react";
import Link from "next/link";
import DashboardLayout from "../../components/DashboardLayout";
import {
  Box, Typography, Paper, CircularProgress, Chip, Grid, Card, CardContent,
  CardActions, Button, Avatar, Divider,
} from "@mui/material";
import WorkIcon from "@mui/icons-material/Work";
import PersonIcon from "@mui/icons-material/Person";
import EmailIcon from "@mui/icons-material/Email";
import PhoneIcon from "@mui/icons-material/Phone";
import DescriptionIcon from "@mui/icons-material/Description";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "";

export default function EmployerPostulaciones() {
  const router = useRouter();
  const { data: session, status } = useSession();
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (status === "loading") return;
    if (!session) { router.push("/login"); return; }

    const jwt = session?.accessToken || session?.user?.token;
    if (!jwt) { setLoading(false); return; }

    // Fetch employer's jobs with their applications
    fetch(`${API_BASE}/api/job/?userId=${session.user.id}`, {
      headers: { Authorization: `Bearer ${jwt}` },
    })
      .then((r) => r.json())
      .then((data) => {
        const jobList = Array.isArray(data) ? data : data.jobs || [];
        setJobs(jobList.filter((j) => (j.candidatesCount || j.candidates_count || 0) > 0));
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [session, status]);

  if (status === "loading" || loading) {
    return (
      <DashboardLayout>
        <Box sx={{ display: "flex", justifyContent: "center", mt: 8 }}><CircularProgress /></Box>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <Box sx={{ p: 3, maxWidth: 900, mx: "auto" }}>
        <Typography variant="h4" fontWeight={600} sx={{ mb: 3 }}>
          Postulaciones Recibidas
        </Typography>

        {jobs.length === 0 ? (
          <Paper sx={{ p: 4, textAlign: "center", borderRadius: 2 }}>
            <WorkIcon sx={{ fontSize: 48, color: "text.secondary", mb: 1 }} />
            <Typography color="text.secondary">
              Aun no recibiste postulaciones. Publica una oferta para empezar.
            </Typography>
            <Button variant="contained" sx={{ mt: 2 }} component={Link} href="/job-create">
              Publicar Oferta
            </Button>
          </Paper>
        ) : (
          jobs.map((job) => (
            <Paper key={job.id} sx={{ mb: 3, borderRadius: 2, overflow: "hidden" }}>
              {/* Job header */}
              <Box sx={{ p: 2, bgcolor: "action.hover", display: "flex", alignItems: "center", gap: 2 }}>
                <WorkIcon color="primary" />
                <Box sx={{ flexGrow: 1 }}>
                  <Typography variant="h6" fontWeight={600}>{job.title}</Typography>
                  <Typography variant="caption" color="text.secondary">
                    {job.candidatesCount || job.candidates_count || 0} postulaciones
                    {job.is_paid && " • Destacada ⭐"}
                  </Typography>
                </Box>
                {job.rubro && <Chip label={job.rubro} size="small" variant="outlined" />}
              </Box>
              <Divider />

              {/* Applicants */}
              <Box sx={{ p: 2 }}>
                {(job.applicants || []).length > 0 ? (
                  <Grid container spacing={2}>
                    {job.applicants.map((applicant) => (
                      <Grid item xs={12} sm={6} key={applicant.id}>
                        <Card variant="outlined" sx={{ height: "100%" }}>
                          <CardContent sx={{ pb: 1 }}>
                            <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, mb: 1 }}>
                              <Avatar sx={{ width: 40, height: 40, bgcolor: "primary.main" }}>
                                <PersonIcon />
                              </Avatar>
                              <Box>
                                <Typography fontWeight={600}>{applicant.name || "Candidato"}</Typography>
                                {applicant.rubro && <Chip label={applicant.rubro} size="small" sx={{ mt: 0.3 }} />}
                              </Box>
                            </Box>
                            {applicant.email && (
                              <Typography variant="body2" color="text.secondary" sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
                                <EmailIcon fontSize="small" /> {applicant.email}
                              </Typography>
                            )}
                            {applicant.phone && (
                              <Typography variant="body2" color="text.secondary" sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
                                <PhoneIcon fontSize="small" /> {applicant.phone}
                              </Typography>
                            )}
                          </CardContent>
                          <CardActions sx={{ pt: 0 }}>
                            {applicant.cvUrl && (
                              <Button size="small" startIcon={<DescriptionIcon />}
                                href={applicant.cvUrl} target="_blank">
                                Ver CV
                              </Button>
                            )}
                            <Button size="small" component={Link} href={`/candidato/${applicant.id}`}>
                              Ver perfil
                            </Button>
                          </CardActions>
                        </Card>
                      </Grid>
                    ))}
                  </Grid>
                ) : (
                  <Typography variant="body2" color="text.secondary" sx={{ py: 1 }}>
                    {(job.candidatesCount || job.candidates_count || 0)} postulaciones — los datos de contacto se envian por email cuando se completa la postulacion.
                  </Typography>
                )}
              </Box>
            </Paper>
          ))
        )}
      </Box>
    </DashboardLayout>
  );
}
