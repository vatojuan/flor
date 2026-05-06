// pages/soluciones/recruitment.js
import {
  Container,
  Typography,
  IconButton,
  Box,
  Grid,
  Card,
  CardContent,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Button,
  Paper
} from "@mui/material";
import MainLayout from "../../components/MainLayout";
import ArrowForwardIosIcon from "@mui/icons-material/ArrowForwardIos";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import { useRouter } from "next/router";

export default function Recruitment() {
  const router = useRouter();
  const handleNext = () => router.push("/soluciones/learning_and_development");
  const handleContact = () => router.push("/contacto");

  const diferenciadores = [
    "Cargás tu búsqueda completando un formulario.",
    "El sistema analiza en tiempo real y te muestra los CVs que coinciden.",
    "Accedés directamente a los perfiles para avanzar en la selección.",
  ];

  const porQueElegir = [
    "Enfoque personalizado",
    "Rapidez y eficiencia",
    "Profesionalismo y confidencialidad",
    "Experiencia comprobada",
  ];

  return (
    <MainLayout>
      {/* Hero */}
      <Box
        sx={{
          background: "linear-gradient(135deg,#0B2A2D 0%, #103B40 50%, #155158 100%)",
          color: "#FFF",
          py: { xs: 6, md: 8 },
        }}
      >
        <Container
          maxWidth="lg"
          sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}
        >
          <Box>
            <Typography variant="h5">Reclutamiento y Selección</Typography>
            <Typography variant="h2" sx={{ fontWeight: 700, mt: 1, lineHeight: 1.2 }}>
              Encontrá el talento<br />ideal para tu empresa
            </Typography>
          </Box>
          <IconButton onClick={handleNext} sx={{ color: "#FFF" }}>
            <ArrowForwardIosIcon fontSize="large" />
          </IconButton>
        </Container>
      </Box>

      {/* Contenido */}
      <Container maxWidth="lg" sx={{ py: 8 }}>
        {/* Intro + CTA */}
        <Paper
          elevation={0}
          sx={{
            p: { xs: 3, md: 4 },
            mb: 8,
            backgroundColor: "rgba(16,59,64,0.85)",
            color: "#FFF",
          }}
        >
          <Typography variant="body1" paragraph>
            En FAP te ayudamos a encontrar el talento alineado con tus valores y objetivos.
            Nuestro servicio se adapta a tus necesidades con un proceso ágil y personalizado, cubriendo
            perfiles de distintos niveles y áreas.
          </Typography>
          <Button variant="contained" size="large" onClick={handleContact}>
            Contáctanos
          </Button>
        </Paper>

        {/* ¿Qué nos diferencia? */}
        <Box sx={{ mb: 10 }}>
          <Typography variant="h4" gutterBottom>
            ¿Qué nos diferencia?
          </Typography>
          <Typography variant="subtitle1" sx={{ mb: 2 }}>
            Contamos con una herramienta exclusiva de matching automático:
          </Typography>
          <List dense>
            {diferenciadores.map((texto, i) => (
              <ListItem key={i} sx={{ pl: 0 }}>
                <ListItemIcon sx={{ minWidth: 32 }}>
                  <CheckCircleIcon color="primary" />
                </ListItemIcon>
                <ListItemText primary={texto} />
              </ListItem>
            ))}
          </List>
        </Box>

        {/* ¿Por qué elegirnos? */}
        <Box sx={{ mb: 12 }}>
          <Typography variant="h4" gutterBottom>
            ¿Por qué elegirnos?
          </Typography>
          <Grid container spacing={4}>
            {porQueElegir.map((texto, i) => (
              <Grid item xs={12} md={3} key={i}>
                <Card
                  elevation={3}
                  sx={{
                    height: "100%",
                    borderTop: "6px solid #D96236",
                    backgroundColor: "#12383C",
                    color: "#FFF",
                    display: "flex",
                    alignItems: "center",
                  }}
                >
                  <CardContent>
                    <Typography variant="body1" align="center">
                      {texto}
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
            ))}
          </Grid>
        </Box>

        {/* CTA final */}
        <Box
          sx={{
            textAlign: "center",
            backgroundColor: "#155158",
            py: 6,
            borderRadius: 2,
          }}
        >
          <Typography variant="h5" sx={{ mb: 2, color: "#FFF" }}>
            ¿Querés sumar talento a tu equipo?
          </Typography>
          <Button variant="contained" size="large" onClick={handleContact}>
            Hablemos
          </Button>
        </Box>
      </Container>
    </MainLayout>
  );
}
