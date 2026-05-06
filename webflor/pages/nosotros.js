// pages/nosotros.js
import { Box, Container, Grid, Typography, Button, IconButton } from '@mui/material';
import Link from 'next/link';
import MainLayout from '../components/MainLayout';
import ArrowForwardIosIcon from '@mui/icons-material/ArrowForwardIos';
import { useRouter } from 'next/router';

export default function Nosotros() {
  const router = useRouter();

  const handleArrowClick = () => {
    // Redirige a recruitment.js (ajusta la ruta si es necesario)
    router.push('/soluciones/recruitment');
  };

  return (
    <MainLayout>
      <Box
        sx={{
          backgroundImage: 'url("/images/fondo-agua.jpg")',
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          backgroundRepeat: 'no-repeat',
          position: 'relative',
          minHeight: 'calc(100vh - 315px)',
        }}
      >
        {/* Overlay para opacar el fondo */}
        <Box
          sx={{
            backgroundColor: 'rgba(16,59,64,0.9)',
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            zIndex: 0,
          }}
        />

        {/* Header: Logo y flecha */}
        <Box sx={{ position: 'relative', zIndex: 1, pt: { xs: 1, md: 2 } }}>
          <Container 
            maxWidth="lg" 
            sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
          >
            {/* Logo a la izquierda */}
            <Box>
              <img src="/images/fap-logo.png" alt="FAP Logo" style={{ width: '120px' }} />
            </Box>
            {/* Flecha a la derecha para navegar a Recruitment */}
            <IconButton onClick={handleArrowClick} sx={{ color: '#fff' }}>
              <ArrowForwardIosIcon fontSize="large" />
            </IconButton>
          </Container>
        </Box>

        {/* Contenido principal */}
        <Container 
          maxWidth="md" 
          sx={{ 
            position: 'relative', 
            zIndex: 1, 
            mt: { xs: 2, md: 4 }, 
            pb: { xs: 2, md: 4 } 
          }}
        >
          <Grid container spacing={{ xs: 2, md: 4 }} alignItems="center">
            {/* Sección "Nosotros" */}
            <Grid item xs={12} md={4}>
              <Typography
                variant="h4"
                align="left"
                sx={{
                  fontFamily: "'Open Sans', sans-serif",
                  fontWeight: 700,
                  color: '#fff',
                  mb: { xs: 1, md: 1 },
                  fontSize: { xs: '2.2rem', md: '3.6rem' },
                }}
              >
                Nosotros
              </Typography>
            </Grid>
            <Grid item xs={12} md={8}>
              <Typography
                variant="body1"
                align="justify"
                sx={{
                  mt: { xs: 1, md: 3 },
                  fontFamily: "'Open Sans', sans-serif",
                  fontSize: { xs: '1rem', md: '1.2rem' },
                  color: '#fff',
                  lineHeight: 1.5,
                  mb: { xs: 1, md: 3 },
                }}
              >
                En FAP Consultora, nos especializamos en la gestión de recursos humanos, brindando soluciones personalizadas que potencian el talento y optimizan el rendimiento organizacional. Trabajamos con un enfoque confiable, flexible y colaborativo, promoviendo relaciones laborales basadas en la transparencia y la empatía.
              </Typography>
            </Grid>

            {/* Sección "Misión y objetivo" */}
            <Grid item xs={12} md={4}>
              <Typography
                variant="h4"
                align="left"
                sx={{
                  fontFamily: "'Open Sans', sans-serif",
                  fontWeight: 700,
                  color: '#fff',
                  mb: { xs: 0.5, md: 0.5 },
                  fontSize: { xs: '2.2rem', md: '3.6rem' },
                }}
              >
                Misión y
              </Typography>
              <Typography
                variant="h4"
                align="left"
                sx={{
                  fontFamily: "'Open Sans', sans-serif",
                  fontWeight: 700,
                  color: '#fff',
                  mb: { xs: 1, md: 3 },
                  fontSize: { xs: '2.2rem', md: '3.6rem' },
                }}
              >
                objetivo
              </Typography>
            </Grid>
            <Grid item xs={12} md={8}>
              <Typography
                variant="body1"
                align="justify"
                sx={{
                  mt: { xs: 1, md: 3 },
                  fontFamily: "'Open Sans', sans-serif",
                  fontSize: { xs: '1rem', md: '1.2rem' },
                  color: '#fff',
                  lineHeight: 1.5,
                  mb: { xs: 1, md: 3 },
                }}
              >
                Colaborar con empresas para mejorar la gestión de sus recursos humanos, ofreciendo estrategias a medida que impulsen un ambiente de trabajo motivador y productivo. Optimizar la gestión del capital humano para mejorar el rendimiento organizacional y el bienestar de los empleados, generando entornos laborales más eficientes y armoniosos.
              </Typography>
            </Grid>

            {/* Sección "Visión y valores" */}
            <Grid item xs={12} md={4}>
              <Typography
                variant="h4"
                align="left"
                sx={{
                  fontFamily: "'Open Sans', sans-serif",
                  fontWeight: 700,
                  color: '#fff',
                  mb: { xs: 0.5, md: 0.5 },
                  fontSize: { xs: '2.2rem', md: '3.6rem' },
                }}
              >
                Visión y
              </Typography>
              <Typography
                variant="h4"
                align="left"
                sx={{
                  fontFamily: "'Open Sans', sans-serif",
                  fontWeight: 700,
                  color: '#fff',
                  mb: { xs: 1, md: 3 },
                  fontSize: { xs: '2.2rem', md: '3.6rem' },
                }}
              >
                valores
              </Typography>
            </Grid>
            <Grid item xs={12} md={8}>
              <Typography
                variant="body1"
                align="justify"
                sx={{
                  mt: { xs: 1, md: 3 },
                  fontFamily: "'Open Sans', sans-serif",
                  fontSize: { xs: '1rem', md: '1.2rem' },
                  color: '#fff',
                  lineHeight: 1.5,
                  mb: { xs: 1, md: 3 },
                }}
              >
                Ser la consultora de referencia en Valle de Uco y Mendoza, reconocida por nuestra excelencia, experiencia y capacidad para contribuir al crecimiento profesional y personal de individuos y organizaciones. Nos guiamos por la solidaridad, la fidelidad y la unión, comprometiéndonos con el bienestar de las personas y el éxito de cada empresa con la que trabajamos.
              </Typography>
            </Grid>

            {/* Botón "Volver al Inicio" centrado */}
            <Grid item xs={12}>
              <Box sx={{ textAlign: 'center', mt: { xs: 2, md: 6 } }}>
                <Button component={Link} href="/" variant="contained" color="primary">
                  Volver al Inicio
                </Button>
              </Box>
            </Grid>
          </Grid>
        </Container>
      </Box>
    </MainLayout>
  );
}
