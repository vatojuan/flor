// pages/soluciones/outsourcing.js
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
  Paper,
  Button,
  Divider,
} from "@mui/material";
import MainLayout from "../../components/MainLayout";
import ArrowForwardIosIcon from "@mui/icons-material/ArrowForwardIos";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import { useRouter } from "next/router";

export default function Outsourcing() {
  const router = useRouter();
  const handleNext = () => router.push("/soluciones/talent_management");
  const handleContact = () => router.push("/contacto");

  /* Servicios de outsourcing (Payroll actualizado) */
  const servicios = [
    {
      titulo: "Payroll Specialist (Responsable de Nóminas)",
      resumen:
        "Gestión integral y conforme a normativas para asegurar procesos precisos y oportunos.",
      bullets: [
        "Determinar el salario bruto y neto",
        "Incluir horas extra, bonos, descuentos y comisiones",
        "Aplicar retenciones y cargas sociales correspondientes",
        "Generar y revisar la nómina periódicamente",
        "Coordinar transferencias bancarias o emisión de cheques",
        "Entregar recibos de sueldo a los empleados",
      ],
    },
    {
      titulo: "Community Manager",
      resumen:
        "Construye una comunidad digital activa y comprometida alrededor de tu marca.",
      bullets: [
        "Estrategia y calendarios de contenido",
        "Diseño de piezas visuales y copywriting",
        "Gestión de la comunidad y atención a usuarios",
        "Campañas publicitarias en redes",
      ],
    },
    {
      titulo: "Catering Corporativo",
      resumen:
        "Soluciones gastronómicas adaptadas a eventos, reuniones y capacitaciones.",
      bullets: [
        "Catering para eventos corporativos y reuniones",
        "Menús saludables y personalizados",
        "Provisión de bebidas y snacks",
        "Servicio de montaje y logística in-situ",
      ],
    },
    {
      titulo: "Software Factory",
      resumen:
        "Productos digitales end-to-end para acelerar la innovación en tu organización.",
      bullets: [
        "Análisis y diseño de soluciones a medida",
        "Desarrollo web y desktop robusto",
        "Aplicaciones móviles nativas o híbridas",
        "Integración de sistemas y plataformas",
        "Mantenimiento, soporte y evolución continua",
      ],
    },
  ];

  const beneficios = [
    "Enfoque en el core de tu negocio",
    "Expertos especializados sin sobrecargar tu staff",
    "Eficiencia operativa y ahorro de costos",
    "Flexibilidad y escalabilidad del servicio",
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
            <Typography variant="h5">Outsourcing</Typography>
            <Typography
              variant="h2"
              sx={{ fontWeight: 700, mt: 1, lineHeight: 1.2 }}
            >
              Expertos externos
              <br />
              para tu eficiencia
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
            Externalizá procesos clave con profesionales de confianza y enfocá
            tus recursos en hacer crecer tu negocio.
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
                    <Typography variant="body2" sx={{ mb: 1.5 }}>
                      {s.resumen}
                    </Typography>
                    <Divider
                      sx={{
                        mb: 1,
                        backgroundColor: "rgba(255,255,255,0.2)",
                      }}
                    />
                    <List dense>
                      {s.bullets.map((b, idx) => (
                        <ListItem key={idx} sx={{ pl: 0 }}>
                          <ListItemIcon sx={{ minWidth: 28 }}>
                            <CheckCircleIcon color="primary" fontSize="small" />
                          </ListItemIcon>
                          <ListItemText primary={b} />
                        </ListItem>
                      ))}
                    </List>
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
            ¡Comencemos a trabajar juntos!
          </Typography>
          <Button variant="contained" size="large" onClick={handleContact}>
            Hablemos
          </Button>
        </Box>
      </Container>
    </MainLayout>
  );
}
