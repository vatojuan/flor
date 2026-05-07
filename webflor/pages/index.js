// pages/index.js
import { Box, Typography, Button, Container, Grid, Paper } from "@mui/material";
import Link from "next/link";
import MainLayout from "../components/MainLayout";
import SearchIcon from "@mui/icons-material/Search";
import UploadFileIcon from "@mui/icons-material/UploadFile";
import WorkIcon from "@mui/icons-material/Work";

export default function Home() {
  return (
    <MainLayout>
      {/* Background video */}
      <Box
        sx={{
          position: "fixed",
          top: 0, left: 0,
          width: "100vw", height: "100vh",
          zIndex: -1,
          overflow: "hidden",
          backgroundColor: "#103B40",
        }}
      >
        <Box
          component="video"
          src="/videos/nuevo-fondo.mp4"
          autoPlay muted loop playsInline
          sx={{
            display: { xs: "none", sm: "block" },
            width: "100%", height: "100%", objectFit: "cover",
          }}
        />
        <Box
          component="video"
          src="/videos/video-movil.mp4"
          autoPlay muted loop playsInline
          sx={{
            display: { xs: "block", sm: "none" },
            width: "100%", height: "100%", objectFit: "cover",
          }}
        />
      </Box>

      {/* Hero overlay content */}
      <Box
        sx={{
          position: "relative",
          zIndex: 1,
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <Container maxWidth="md" sx={{ textAlign: "center" }}>
          {/* CTA Cards */}
          <Grid container spacing={3} justifyContent="center" sx={{ mt: 4 }}>
            <Grid item xs={12} sm={4}>
              <Paper
                component={Link}
                href="/servicios/busqueda"
                sx={{
                  p: 3, textAlign: "center", borderRadius: 3, textDecoration: "none",
                  bgcolor: "rgba(255,255,255,0.12)", backdropFilter: "blur(10px)",
                  border: "1px solid rgba(255,255,255,0.2)",
                  transition: "all 0.3s",
                  "&:hover": { bgcolor: "rgba(217,98,54,0.25)", transform: "translateY(-4px)" },
                }}
              >
                <SearchIcon sx={{ fontSize: 48, color: "#D96236", mb: 1 }} />
                <Typography variant="h6" sx={{ color: "#fff", fontWeight: 600 }}>
                  Necesito Personal
                </Typography>
                <Typography variant="body2" sx={{ color: "rgba(255,255,255,0.8)", mt: 0.5 }}>
                  Encontramos candidatos en 24-48hs
                </Typography>
              </Paper>
            </Grid>
            <Grid item xs={12} sm={4}>
              <Paper
                component={Link}
                href="/cv/upload"
                sx={{
                  p: 3, textAlign: "center", borderRadius: 3, textDecoration: "none",
                  bgcolor: "rgba(255,255,255,0.12)", backdropFilter: "blur(10px)",
                  border: "1px solid rgba(255,255,255,0.2)",
                  transition: "all 0.3s",
                  "&:hover": { bgcolor: "rgba(217,98,54,0.25)", transform: "translateY(-4px)" },
                }}
              >
                <UploadFileIcon sx={{ fontSize: 48, color: "#D96236", mb: 1 }} />
                <Typography variant="h6" sx={{ color: "#fff", fontWeight: 600 }}>
                  Subir mi CV
                </Typography>
                <Typography variant="body2" sx={{ color: "rgba(255,255,255,0.8)", mt: 0.5 }}>
                  Registrate y accede a ofertas
                </Typography>
              </Paper>
            </Grid>
            <Grid item xs={12} sm={4}>
              <Paper
                component={Link}
                href="/job-list"
                sx={{
                  p: 3, textAlign: "center", borderRadius: 3, textDecoration: "none",
                  bgcolor: "rgba(255,255,255,0.12)", backdropFilter: "blur(10px)",
                  border: "1px solid rgba(255,255,255,0.2)",
                  transition: "all 0.3s",
                  "&:hover": { bgcolor: "rgba(217,98,54,0.25)", transform: "translateY(-4px)" },
                }}
              >
                <WorkIcon sx={{ fontSize: 48, color: "#D96236", mb: 1 }} />
                <Typography variant="h6" sx={{ color: "#fff", fontWeight: 600 }}>
                  Ver Ofertas
                </Typography>
                <Typography variant="body2" sx={{ color: "rgba(255,255,255,0.8)", mt: 0.5 }}>
                  Explora empleos disponibles
                </Typography>
              </Paper>
            </Grid>
          </Grid>
        </Container>
      </Box>
    </MainLayout>
  );
}
