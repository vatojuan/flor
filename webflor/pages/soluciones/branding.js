// pages/soluciones/branding.js
import {
  Container,
  Typography,
  IconButton,
  Grid,
  Card,
  CardContent,
  Box,
  Button,
  Paper,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
} from "@mui/material";
import MainLayout from "../../components/MainLayout";
import ArrowForwardIosIcon from "@mui/icons-material/ArrowForwardIos";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import { useRouter } from "next/router";

export default function Branding() {
  const router = useRouter();
  const handleNext = () => router.push("/soluciones/outsourcing");
  const handleContact = () => router.push("/contacto");

  const servicios = [
    "Diagnóstico y desarrollo de estrategias de Employer Branding",
    "Comunicación interna y programas de reconocimiento",
    "Cultura organizacional y experiencia del empleado",
  ];

  const beneficios = [
    "Atracción de talento calificado",
    "Mayor compromiso y productividad",
    "Menor rotación de personal",
    "Mejor reputación empresarial",
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
          sx={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <Box>
            <Typography variant="h5">Employer Branding & Engagement</Typography>
            <Typography
              variant="h2"
              sx={{ fontWeight: 700, mt: 1, lineHeight: 1.2 }}
            >
              Construí tu
              <br />
              marca empleadora
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
            En FAP ayudamos a las empresas a fortalecer su marca empleadora y
            potenciar el compromiso de sus colaboradores, creando un entorno de
            trabajo atractivo y motivador.
          </Typography>
          <Button
            variant="contained"
            size="large"
            sx={{ mt: 1 }}
            onClick={handleContact}
          >
            Contáctanos
          </Button>
        </Paper>

        {/* ¿Por qué es importante? */}
        <Box sx={{ mb: 10 }}>
          <Typography variant="h4" gutterBottom>
            ¿Por qué es importante?
          </Typography>
          <List dense>
            {[
              "Employer Branding: proyecta una imagen sólida para atraer y retener talento.",
              "Employee Engagement: impulsa satisfacción, productividad y reduce la rotación.",
            ].map((texto, i) => (
              <ListItem key={i} sx={{ pl: 0 }}>
                <ListItemIcon sx={{ minWidth: 32 }}>
                  <CheckCircleIcon color="primary" />
                </ListItemIcon>
                <ListItemText primary={texto} />
              </ListItem>
            ))}
          </List>
        </Box>

        {/* Nuestros servicios */}
        <Box sx={{ mb: 10 }}>
          <Typography variant="h4" gutterBottom>
            Nuestro servicio
          </Typography>
          <Grid container spacing={4}>
            {servicios.map((s, i) => (
              <Grid item xs={12} md={4} key={i}>
                <Card
                  elevation={3}
                  sx={{
                    height: "100%",
                    borderTop: "6px solid #D96236",
                    backgroundColor: "#12383C",
                    color: "#FFF",
                  }}
                >
                  <CardContent>
                    <Typography variant="body1">{s}</Typography>
                  </CardContent>
                </Card>
              </Grid>
            ))}
          </Grid>
        </Box>

        {/* Beneficios */}
        <Box sx={{ mb: 12 }}>
          <Typography variant="h4" gutterBottom>
            Beneficios
          </Typography>
          <Grid container spacing={2}>
            {beneficios.map((b, i) => (
              <Grid item xs={12} md={6} key={i}>
                <Box sx={{ display: "flex", alignItems: "center" }}>
                  <CheckCircleIcon color="primary" sx={{ mr: 1 }} />
                  <Typography variant="body1" sx={{ fontWeight: 500 }}>
                    {b}
                  </Typography>
                </Box>
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
            ¿Listo para destacar como empleador?
          </Typography>
          <Button
            variant="contained"
            size="large"
            color="primary"
            onClick={handleContact}
          >
            Hablemos
          </Button>
        </Box>
      </Container>
    </MainLayout>
  );
}
