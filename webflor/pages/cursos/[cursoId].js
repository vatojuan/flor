// pages/cursos/[cursoId].js
import React, {
  useCallback,
  useEffect,
  useRef,
  useState,
} from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import {
  Alert,
  Box,
  Button,
  Container,
  CircularProgress,
  Divider,
  Grid,
  LinearProgress,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Paper,
  Snackbar,
  Typography,
} from '@mui/material';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import PlayCircleOutlineIcon from '@mui/icons-material/PlayCircleOutline';
import DashboardLayout from '../../components/DashboardLayout';
import useAuthUser from '../../hooks/useAuthUser';

const API_BASE =
  process.env.NEXT_PUBLIC_API_URL || 'https://api.fapmendoza.online';

/* ------------------------------------------------------------ *
 |                          Página                              |
 * ------------------------------------------------------------ */
export default function CursoDetallePage({ toggleDarkMode, currentMode }) {
  const { user, ready: authReady, token } = useAuthUser();
  const router = useRouter();
  const { cursoId } = router.query;

  const [course, setCourse] = useState(null);
  const [selectedLesson, setSelectedLesson] = useState(null);
  const [loading, setLoading] = useState(true);
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: '',
    severity: 'success',
  });

  const videoRef = useRef(null);
  const [maxWatched, setMaxWatched] = useState(0);

  /* ---------------------- Helpers UI ----------------------- */
  const showMessage = (msg, severity = 'success') =>
    setSnackbar({ open: true, message: msg, severity });

  /* ----------------------- Fetch --------------------------- */
  const fetchDetails = useCallback(async () => {
    if (!cursoId || !token) return;
    try {
      setLoading(true);
      const res = await fetch(
        `${API_BASE}/training/courses/${cursoId}/details`,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (!res.ok)
        throw new Error(
          (await res.json()).detail || 'Error al cargar detalles'
        );

      const data = await res.json();
      setCourse(data);

      const firstUncompleted = data.lessons.find((l) => !l.isCompleted);
      setSelectedLesson(firstUncompleted || data.lessons[0] || null);
      setMaxWatched(0);
    } catch (err) {
      showMessage(err.message, 'error');
    } finally {
      setLoading(false);
    }
  }, [cursoId, token]);

  useEffect(() => {
    if (!authReady) return;
    user ? fetchDetails() : router.push('/login');
  }, [authReady, user, router, fetchDetails]);

  /* --------------- Completar lección auto ----------------- */
  const markLessonCompleted = useCallback(
    async (lessonId) => {
      if (!lessonId || !token) return;
      try {
        const res = await fetch(
          `${API_BASE}/training/lessons/${lessonId}/complete`,
          { method: 'POST', headers: { Authorization: `Bearer ${token}` } }
        );

        if (!res.ok)
          throw new Error(
            (await res.json()).detail || 'Error al marcar lección'
          );

        await fetchDetails();
        showMessage('¡Lección completada!');
      } catch (err) {
        showMessage(err.message, 'error');
      }
    },
    [token, fetchDetails]
  );

  /* -------------------- Abandonar ------------------------- */
  const handleUnenroll = useCallback(async () => {
    if (!token) return;
    try {
      const res = await fetch(
        `${API_BASE}/training/unenroll/${cursoId}`,
        { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } }
      );

      if (!res.ok)
        throw new Error(
          (await res.json()).detail || 'Error al abandonar curso'
        );

      showMessage('Curso abandonado', 'info');
      router.push('/training');
    } catch (err) {
      showMessage(err.message, 'error');
    }
  }, [token, cursoId, router]);

  /* ------------ Anti-adelanto de video -------------------- */
  const handleTimeUpdate = () => {
    const v = videoRef.current;
    if (v && v.currentTime > maxWatched) setMaxWatched(v.currentTime);
  };

  const handleSeeking = () => {
    const v = videoRef.current;
    if (v && v.currentTime > maxWatched + 0.1) v.currentTime = maxWatched;
  };

  /* ----------------------- Loaders ------------------------ */
  if (!authReady || loading) {
    return (
      <DashboardLayout>
        <Container sx={{ textAlign: 'center', mt: 6 }}>
          <CircularProgress />
        </Container>
      </DashboardLayout>
    );
  }

  if (!course) {
    return (
      <DashboardLayout>
        <Container sx={{ mt: 6 }}>
          <Typography>Curso no encontrado.</Typography>
        </Container>
      </DashboardLayout>
    );
  }

  /* ----------------------- JSX --------------------------- */
  return (
    <DashboardLayout
      toggleDarkMode={toggleDarkMode}
      currentMode={currentMode}
    >
      <Container maxWidth="lg" sx={{ mt: 4, mb: 6 }}>
        {/* Encabezado */}
        <Box
          sx={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            mb: 2,
          }}
        >
          <Typography variant="h4">{course.title}</Typography>
          <Button
            variant="outlined"
            color="error"
            onClick={handleUnenroll}
          >
            Abandonar curso
          </Button>
        </Box>

        {/* Progreso */}
        <LinearProgress
          variant="determinate"
          value={course.progress}
          sx={{ height: 10, borderRadius: 2 }}
        />
        <Typography
          variant="caption"
          color={course.progress === 100 ? 'success.main' : 'text.secondary'}
        >
          {course.progress === 100
            ? 'Curso completado'
            : `${course.progress}% completado`}
        </Typography>

        {/* Contenido */}
        <Grid container spacing={4} sx={{ mt: 2 }}>
          {/* Video + detalles */}
          <Grid item xs={12} md={8}>
            <Paper sx={{ p: 2 }}>
              {selectedLesson ? (
                <>
                  <Typography variant="h6" gutterBottom>
                    {selectedLesson.title}
                  </Typography>

                  <Box
                    sx={{
                      position: 'relative',
                      pt: '56.25%',
                      bgcolor: '#000',
                    }}
                  >
                    <video
                      key={selectedLesson.id}
                      ref={videoRef}
                      src={selectedLesson.videoUrl}
                      controls
                      style={{
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        width: '100%',
                        height: '100%',
                      }}
                      onTimeUpdate={handleTimeUpdate}
                      onSeeking={handleSeeking}
                      onEnded={() =>
                        markLessonCompleted(selectedLesson.id)
                      }
                    />
                  </Box>

                  <Divider sx={{ my: 2 }} />

                  <Typography variant="body2" color="text.secondary">
                    {selectedLesson.isCompleted
                      ? 'Lección completada.'
                      : 'Visualiza el video completo para avanzar.'}
                  </Typography>
                </>
              ) : (
                <Typography>Este curso no tiene lecciones.</Typography>
              )}
            </Paper>
          </Grid>

          {/* Lista de lecciones */}
          <Grid item xs={12} md={4}>
            <Paper sx={{ p: 2, maxHeight: '80vh', overflowY: 'auto' }}>
              <Typography variant="h6" gutterBottom>
                Lecciones
              </Typography>

              <List>
                {course.lessons.map((l) => (
                  <ListItem
                    key={l.id}
                    button
                    selected={selectedLesson?.id === l.id}
                    onClick={() => {
                      setSelectedLesson(l);
                      setMaxWatched(0);
                    }}
                    sx={{ mb: 1, border: '1px solid #ddd', borderRadius: 1 }}
                  >
                    <ListItemIcon>
                      {l.isCompleted ? (
                        <CheckCircleIcon color="success" />
                      ) : (
                        <PlayCircleOutlineIcon />
                      )}
                    </ListItemIcon>
                    <ListItemText
                      primary={l.title}
                      secondary={`Lección ${l.orderIndex + 1}`}
                    />
                  </ListItem>
                ))}
              </List>
            </Paper>
          </Grid>
        </Grid>

        {/* Navegación */}
        <Divider sx={{ my: 4 }} />
        <Box sx={{ textAlign: 'center' }}>
          <Link href="/dashboard" passHref legacyBehavior>
            <Button variant="contained" component="a">
              Volver al Dashboard
            </Button>
          </Link>
        </Box>

        {/* Snackbar */}
        <Snackbar
          open={snackbar.open}
          autoHideDuration={4000}
          onClose={() => setSnackbar((s) => ({ ...s, open: false }))}
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
