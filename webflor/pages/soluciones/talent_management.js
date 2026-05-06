// pages/soluciones/talent_management.js
import {
  Container,
  Typography,
  IconButton,
  Box,
  Grid,
  Card,
  CardContent,
  Paper,
  Button,
  Divider,
} from "@mui/material";
import MainLayout from "../../components/MainLayout";
import ArrowForwardIosIcon from "@mui/icons-material/ArrowForwardIos";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import { useRouter } from "next/router";

export default function TalentManagement() {
  const router = useRouter();
  const handleNext = () => router.push("/contacto");
  const handleContact = () => router.push("/contacto");

  /* Servicios principales (actualizado) */
  const servicios = [
    {
      titulo: "Onboarding e Incorporación",
      resumen:
        "Orientamos a los nuevos empleados, facilitamos la documentación y herramientas necesarias y comunicamos las normas internas, la cultura y los valores de tu empresa.",
    },
    {
      titulo: "Gestión de Nómina y Beneficios",
      resumen:
        "Calculamos y pagamos sueldos con precisión, administramos seguros, bonos, vacaciones y dejamos siempre al día los legajos y registros laborales.",
    },
    {
      titulo: "Altas, Bajas y Movimientos",
      resumen:
        "Tramitamos de forma ágil los ingresos, egresos y modificaciones contractuales ante las entidades laborales correspondientes.",
    },
    {
      titulo: "Evaluación del Desempeño",
      resumen:
        "Definimos objetivos claros, realizamos revisiones periódicas de desempeño y proponemos planes de mejora, promociones o ajustes salariales.",
    },
    {
      titulo: "Clima y Relaciones Laborales",
      resumen:
        "Medimos la satisfacción y motivación del personal, resolvemos conflictos internos y promovemos un ambiente de trabajo saludable.",
    },
    {
      titulo: "Asesoría Legal Laboral",
      resumen:
        "Redacción y actualización de contratos, más acompañamiento constante para el cumplimiento de toda la normativa vigente.",
    },
  ];

  const beneficios = [
    "Reducción de riesgos legales y administrativos",
    "Mayor eficiencia en la gestión del personal",
    "Confidencialidad y precisión en el manejo de la información",
    "Cumplimiento pleno con normativas laborales y fiscales",
  ];

  return (
    <MainLayout>
      {/* Hero */}
      <Box
        sx={{
          background:
            "linear-gradient(135deg,#0B2A2D 0%, #103B40 50%, #155158 100%)",
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
            <Typography variant="h5">Talent Management</Typography>
            <Typography
              variant="h2"
              sx={{ fontWeight: 700, mt: 1, lineHeight: 1.2 }}
            >
              Administración de
              <br />
              Personal Estratégica
            </Typography>
          </Box>
          <IconButton onClick={handleNext} sx={{ color: "#FFF" }}>
            <ArrowForwardIosIcon fontSize="large" />
          </IconButton>
        </Container>
      </Box>

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
            Nos ocupamos de todo el ciclo de vida administrativo del empleado,
            asegurando el cumplimiento normativo y liberando a tu organización
            para que pueda enfocarse en el crecimiento estratégico.
          </Typography>
          <Button variant="contained" size="large" onClick={handleContact}>
            Contáctanos
          </Button>
        </Paper>

        {/* Servicios */}
        <Box sx={{ mb: 10 }}>
          <Typography variant="h4" gutterBottom>
            Nuestros servicios
          </Typography>
          <Grid container spacing={4}>
            {servicios.map((s, i) => (
              <Grid item xs={12} md={6} key={i}>
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
                    <Typography variant="h6" gutterBottom>
                      {s.titulo}
                    </Typography>
                    <Divider
                      sx={{
                        mb: 1,
                        width: 40,
                        backgroundColor: "rgba(255,255,255,0.3)",
                      }}
                    />
                    <Typography variant="body2">{s.resumen}</Typography>
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
            ¿Necesitás optimizar tu administración de personal?
          </Typography>
          <Button variant="contained" size="large" onClick={handleContact}>
            Hablemos
          </Button>
        </Box>
      </Container>
    </MainLayout>
  );
}
