// pages/training.js
import React, { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import {
  Alert,
  Box,
  Button,
  Card,
  CardActions,
  CardContent,
  CardMedia,
  CircularProgress,
  Container,
  Divider,
  Grid,
  LinearProgress,
  Paper,
  Snackbar,
  Typography,
} from '@mui/material';
import DashboardLayout from '../components/DashboardLayout';
import useAuthUser from '../hooks/useAuthUser';

const API_BASE =
  process.env.NEXT_PUBLIC_API_URL || 'https://api.fapmendoza.online';

/* ------------------------------------------------------------ *
 |                           Card                               |
 * ------------------------------------------------------------ */
function CourseCard({ course, onEnroll }) {
  const router = useRouter();
  const goToCourse = () => router.push(`/cursos/${course.id}`);

  return (
    <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <CardMedia
        component="img"
        height="140"
        image={
          course.imageUrl ||
          'https://placehold.co/600x400/4E342E/FFF?text=Curso'
        }
        alt={`Portada de ${course.title}`}
        onError={(e) => {
          e.target.onerror = null;
          e.target.src =
            'https://placehold.co/600x400/4E342E/FFF?text=Error';
        }}
      />

      <CardContent sx={{ flexGrow: 1 }}>
        <Typography gutterBottom variant="h6" component="div">
          {course.title}
        </Typography>

        <Typography variant="body2" color="text.secondary">
          {course.description}
        </Typography>

        {course.isEnrolled && (
          <Box sx={{ mt: 2 }}>
            <LinearProgress variant="determinate" value={course.progress} />
            <Typography
              variant="caption"
              color="text.secondary"
              sx={{ display: 'block', textAlign: 'right' }}
            >
              {course.progress}% completado
            </Typography>
          </Box>
        )}
      </CardContent>

      <CardActions sx={{ justifyContent: 'flex-end', p: 2 }}>
        {course.isEnrolled ? (
          <Button size="small" variant="contained" onClick={goToCourse}>
            Ver Curso
          </Button>
        ) : (
          <Button
            size="small"
            variant="outlined"
            onClick={() => onEnroll(course.id)}
          >
            Inscribirme
          </Button>
        )}
      </CardActions>
    </Card>
  );
}

/* ------------------------------------------------------------ *
 |                         Página                               |
 * ------------------------------------------------------------ */
export default function TrainingPage({ toggleDarkMode, currentMode }) {
  const { user, ready: authReady, token } = useAuthUser();
  const router = useRouter();

  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: '',
    severity: 'success',
  });

  /* ------------------------ Fetch -------------------------- */
  const fetchCourses = useCallback(async () => {
    if (!token) {
      setLoading(false);
      return;
    }

    try {
      const res = await fetch(`${API_BASE}/training/courses`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!res.ok) throw new Error('No se pudieron cargar los cursos.');
      setCourses(await res.json());
    } catch (err) {
      setSnackbar({ open: true, message: err.message, severity: 'error' });
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    if (!authReady) return;
    user ? fetchCourses() : router.push('/login');
  }, [authReady, user, router, fetchCourses]);

  /* --------------------- Enroll handler -------------------- */
  const handleEnroll = useCallback(
    async (courseId) => {
      if (!token) {
        setSnackbar({
          open: true,
          message: 'Debes iniciar sesión.',
          severity: 'error',
        });
        return;
      }

      try {
        const res = await fetch(`${API_BASE}/training/enroll/${courseId}`, {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}` },
        });

        if (!res.ok)
          throw new Error(
            (await res.json()).detail || 'Error al inscribirse.'
          );

        setSnackbar({
          open: true,
          message: '¡Inscripción exitosa!',
          severity: 'success',
        });
        fetchCourses();
      } catch (err) {
        setSnackbar({ open: true, message: err.message, severity: 'error' });
      }
    },
    [token, fetchCourses]
  );

  /* ------------------------ Loader ------------------------- */
  if (!authReady || loading) {
    return (
      <DashboardLayout>
        <Container sx={{ textAlign: 'center', mt: 6 }}>
          <CircularProgress />
        </Container>
      </DashboardLayout>
    );
  }

  /* ------------------------ JSX --------------------------- */
  return (
    <DashboardLayout
      toggleDarkMode={toggleDarkMode}
      currentMode={currentMode}
    >
      <Container maxWidth="lg" sx={{ mt: 4, mb: 6 }}>
        <Typography variant="h4" gutterBottom>
          Formación y Capacitación
        </Typography>

        <Typography variant="body1" color="text.secondary" sx={{ mb: 4 }}>
          Explora nuestros cursos y mejora tus habilidades profesionales.
        </Typography>

        {courses.length ? (
          <Grid container spacing={4}>
            {courses.map((course) => (
              <Grid key={course.id} item xs={12} sm={6} md={4}>
                <CourseCard course={course} onEnroll={handleEnroll} />
              </Grid>
            ))}
          </Grid>
        ) : (
          <Paper sx={{ p: 4, textAlign: 'center', mt: 6 }}>
            <Typography variant="h6">No hay cursos disponibles</Typography>
            <Typography color="text.secondary">
              Vuelve a consultar más tarde.
            </Typography>
          </Paper>
        )}

        <Divider sx={{ my: 5 }} />

        <Box sx={{ textAlign: 'center' }}>
          <Link href="/dashboard" passHref legacyBehavior>
            <Button variant="contained" component="a">
              Volver al Dashboard
            </Button>
          </Link>
        </Box>

        <Snackbar
          open={snackbar.open}
          autoHideDuration={4000}
          onClose={() => setSnackbar((s) => ({ ...s, open: false }))}
          anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
        >
          <Alert
            onClose={() => setSnackbar((s) => ({ ...s, open: false }))}
            severity={snackbar.severity}
            variant="filled"
            sx={{ width: '100%' }}
          >
            {snackbar.message}
          </Alert>
        </Snackbar>
      </Container>
    </DashboardLayout>
  );
}
