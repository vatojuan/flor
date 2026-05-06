// pages/soluciones/learning_and_development.js
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
} from "@mui/material";
import MainLayout from "../../components/MainLayout";
import ArrowForwardIosIcon from "@mui/icons-material/ArrowForwardIos";
import { useRouter } from "next/router";

export default function LearningAndDevelopment() {
  const router = useRouter();
  const handleNext = () => router.push("/soluciones/branding");
  const handleContact = () => router.push("/contacto");

  const bloques = [
    {
      titulo: "Liderazgo y Gestión Humana para Nuevos Tiempos",
      subtitulo: "Liderar para Conectar: Equipos que Transforman",
      texto:
        "Desarrollamos líderes capaces de generar conexión genuina, alinear valores y movilizar equipos desde la motivación y la claridad. Los equipos ya no siguen jerarquías: siguen a quienes los inspiran.",
    },
    {
      titulo: "Coaching y Mentoring Estratégico",
      subtitulo: "Talento que se queda, aprende y se multiplica",
      texto:
        "Convertimos el potencial interno en resultados concretos. Implementamos sistemas de coaching y mentoring orientados a reducir la rotación, empoderar la toma de decisiones y acelerar el crecimiento sostenible.",
    },
    {
      titulo: "Desarrollo para el Alto Desempeño",
      subtitulo: "Mentalidad de Excelencia",
      texto:
        "Instalamos una cultura de aprendizaje continuo, pensamiento estratégico e innovación práctica. El alto rendimiento se logra cuando el propósito cuenta con una dirección clara.",
    },
    {
      titulo: "Cultura Organizacional y Clima Laboral",
      subtitulo: "Organizaciones con Identidad Resiliente",
      texto:
        "Diseñamos culturas firmes, humanas y sostenibles que trascienden los cambios y fortalecen el compromiso emocional de las personas con su trabajo.",
    },
    {
      titulo: "Ambientes Laborales Saludables y Atractivos",
      subtitulo: "Del trabajo como carga al trabajo como motor",
      texto:
        "Creamos espacios que cuidan, inspiran y contienen: claves para atraer y fidelizar talento en una era en la que el bienestar dejó de ser opcional para convertirse en ventaja competitiva.",
    },
    {
      titulo: "Comunicación y Habilidades Humanas Avanzadas",
      subtitulo: "Comunicación Transformadora",
      texto:
        "Fomentamos escucha activa, feedback con propósito y conversaciones valientes. Los equipos que se comunican con inteligencia generan sinergias que otros solo imaginan.",
    },
    {
      titulo: "Bienestar Integral y Mindfulness Corporativo",
      subtitulo: "Talento cuidado, talento que rinde",
      texto:
        "Aplicamos estrategias prácticas de bienestar emocional, gestión del estrés y pausas conscientes para reducir el ausentismo y potenciar un rendimiento sostenible.",
    },
    {
      titulo: "Nutrición Inteligente en el Trabajo",
      subtitulo: "Alimentación con impacto",
      texto:
        "La productividad, el foco y la energía sostenida empiezan en lo que comemos. Diseñamos programas alimentarios simples y eficaces para contextos laborales reales.",
    },
    {
      titulo: "Innovación y Digitalización Humana",
      subtitulo: "Personas preparadas para el futuro digital",
      texto:
        "Integramos habilidades digitales, mentalidad ágil y herramientas listas para usar desde el primer día. La tecnología al servicio de las personas y de los resultados.",
    },
  ];

  return (
    <MainLayout>
      {/* HERO */}
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
            <Typography variant="h5">Learning and Development</Typography>
            <Typography
              variant="h2"
              sx={{ fontWeight: 700, mt: 1, lineHeight: 1.2 }}
            >
              Formación que transforma
              <br />
              personas y organizaciones
            </Typography>
          </Box>
          <IconButton onClick={handleNext} sx={{ color: "#FFF" }}>
            <ArrowForwardIosIcon fontSize="large" />
          </IconButton>
        </Container>
      </Box>

      {/* INTRO + CTA */}
      <Container maxWidth="lg" sx={{ py: 8 }}>
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
            En FAP diseñamos experiencias de aprendizaje que impulsan el cambio
            real. Formamos equipos preparados para afrontar los desafíos
            actuales y futuros, abordando bienestar, innovación y propósito
            compartido.
          </Typography>
          <Button variant="contained" size="large" onClick={handleContact}>
            Contáctanos
          </Button>
        </Paper>

        {/* BLOQUES */}
        <Box sx={{ mb: 10 }}>
          <Typography variant="h4" gutterBottom>
            Soluciones para potenciar a tu equipo
          </Typography>
          <Grid container spacing={4}>
            {bloques.map((b, i) => (
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
                      {b.titulo}
                    </Typography>
                    <Typography
                      variant="subtitle1"
                      sx={{
                        fontWeight: 600,
                        mb: 1,
                        "&::before": {
                          content: '"•"',
                          display: "inline-block",
                          color: "#D96236",
                          fontWeight: 900,
                          mr: 1,
                        },
                      }}
                    >
                      {b.subtitulo}
                    </Typography>
                    <Typography variant="body2">{b.texto}</Typography>
                  </CardContent>
                </Card>
              </Grid>
            ))}
          </Grid>
        </Box>

        {/* CTA FINAL */}
        <Box
          sx={{
            textAlign: "center",
            backgroundColor: "#155158",
            py: 6,
            borderRadius: 2,
          }}
        >
          <Typography variant="h5" sx={{ mb: 2, color: "#FFF" }}>
            ¿Buscás capacitar a tu equipo o impulsar tu solución digital?
          </Typography>
          <Button variant="contained" size="large" onClick={handleContact}>
            Hablemos
          </Button>
        </Box>
      </Container>
    </MainLayout>
  );
}
