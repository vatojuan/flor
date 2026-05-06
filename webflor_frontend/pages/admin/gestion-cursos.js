import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/router';
import {
  Box, Container, Typography, TextField, Button, Snackbar, Alert, CircularProgress,
  Accordion, AccordionSummary, AccordionDetails, Table, TableBody, TableCell,
  TableContainer, TableHead, TableRow, Paper, LinearProgress, Modal, Divider, IconButton,
  Dialog, DialogActions, DialogContent, DialogContentText, DialogTitle, Tooltip
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import AddCircleOutlineIcon from '@mui/icons-material/AddCircleOutline';
import DeleteIcon from '@mui/icons-material/Delete';
import EditIcon from '@mui/icons-material/Edit';
import DownloadIcon from '@mui/icons-material/Download';
import DashboardLayout from '../../components/DashboardLayout';
import useAdminAuth from '../../hooks/useAdminAuth';

// --- Funciones de API (Idealmente, mover a un archivo de servicios: /services/api.js) ---
const apiRequest = async (endpoint, token, options = {}) => {
  const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}${endpoint}`, {
    ...options,
    headers: {
      ...options.headers,
      'Authorization': `Bearer ${token}`,
    },
  });

  if (!res.ok && res.status !== 204) { // 204 No Content es una respuesta exitosa para DELETE
    const error = await res.json().catch(() => ({ detail: 'Error desconocido en la respuesta de la API' }));
    throw new Error(error.detail || 'Ocurrió un error');
  }
  
  if (res.status === 204) {
    return null;
  }

  return res.json();
};

// --- Componente Modal para Añadir Lección ---
const AddLessonModal = ({ open, handleClose, courseId, onLessonAdded }) => {
    const [lesson, setLesson] = useState({ title: '', orderIndex: '', video: null });
    const [submitting, setSubmitting] = useState(false);

    const handleChange = (e) => {
        const { name, value, files } = e.target;
        setLesson(prev => ({ ...prev, [name]: files ? files[0] : value }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setSubmitting(true);
        const token = localStorage.getItem('adminToken');
        const formData = new FormData();
        formData.append('title', lesson.title);
        formData.append('order_index', lesson.orderIndex);
        formData.append('video', lesson.video);

        try {
            await apiRequest(`/training/courses/${courseId}/lessons`, token, { method: 'POST', body: formData });
            onLessonAdded('Lección añadida con éxito', 'success');
            handleClose();
            setLesson({ title: '', orderIndex: '', video: null });
        } catch (error) {
            onLessonAdded(error.message, 'error');
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <Modal open={open} onClose={handleClose}>
            <Paper sx={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', width: { xs: '90%', sm: 400 }, p: 4 }}>
                <Typography variant="h6" gutterBottom>Añadir Nueva Lección</Typography>
                <Box component="form" onSubmit={handleSubmit} sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                    <TextField name="title" label="Título de la Lección" value={lesson.title} onChange={handleChange} required fullWidth />
                    <TextField name="orderIndex" label="Número de Orden" type="number" value={lesson.orderIndex} onChange={handleChange} required fullWidth />
                    <Button variant="outlined" component="label">
                        Seleccionar Video
                        <input name="video" type="file" hidden onChange={handleChange} required accept="video/*" />
                    </Button>
                    {lesson.video && <Typography variant="caption">{lesson.video.name}</Typography>}
                    <Button type="submit" variant="contained" disabled={submitting || !lesson.video}>
                        {submitting ? <CircularProgress size={24} /> : 'Añadir Lección'}
                    </Button>
                </Box>
            </Paper>
        </Modal>
    );
};

// --- Componente Modal para Editar Lección ---
const EditLessonModal = ({ open, handleClose, lesson, onLessonEdited }) => {
    const [editedLesson, setEditedLesson] = useState({ title: '', orderIndex: '' });
    const [submitting, setSubmitting] = useState(false);

    useEffect(() => {
        if (lesson) {
            setEditedLesson({ title: lesson.title, orderIndex: lesson.orderIndex });
        }
    }, [lesson]);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setEditedLesson(prev => ({ ...prev, [name]: value }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setSubmitting(true);
        const token = localStorage.getItem('adminToken');
        const formData = new FormData();
        formData.append('title', editedLesson.title);
        formData.append('order_index', editedLesson.orderIndex);

        try {
            await apiRequest(`/training/admin/lessons/${lesson.id}`, token, { method: 'PUT', body: formData });
            onLessonEdited('Lección actualizada con éxito', 'success');
            handleClose();
        } catch (error) {
            onLessonEdited(error.message, 'error');
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <Modal open={open} onClose={handleClose}>
            <Paper sx={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', width: { xs: '90%', sm: 400 }, p: 4 }}>
                <Typography variant="h6" gutterBottom>Editar Lección</Typography>
                <Box component="form" onSubmit={handleSubmit} sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                    <TextField name="title" label="Título de la Lección" value={editedLesson.title} onChange={handleChange} required fullWidth />
                    <TextField name="orderIndex" label="Número de Orden" type="number" value={editedLesson.orderIndex} onChange={handleChange} required fullWidth />
                    <Button type="submit" variant="contained" disabled={submitting}>
                        {submitting ? <CircularProgress size={24} /> : 'Guardar Cambios'}
                    </Button>
                </Box>
            </Paper>
        </Modal>
    );
};


export default function GestionCursos({ toggleDarkMode, currentMode }) {
  const { user, loading: adminLoading } = useAdminAuth();
  const router = useRouter();

  const [courses, setCourses] = useState([]);
  const [courseDetails, setCourseDetails] = useState({});
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });
  
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedCourse, setSelectedCourse] = useState(null);

  const [newCourse, setNewCourse] = useState({ title: '', description: '', image: null });
  
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [courseToDelete, setCourseToDelete] = useState(null);

  const [editModalOpen, setEditModalOpen] = useState(false);
  const [lessonToEdit, setLessonToEdit] = useState(null);
  const [deleteLessonDialogOpen, setDeleteLessonDialogOpen] = useState(false);
  const [lessonToDelete, setLessonToDelete] = useState(null);

  const fetchCourses = useCallback(async () => {
    const token = localStorage.getItem('adminToken');
    if (!token) return;
    try {
      const coursesData = await apiRequest('/training/admin/courses', token);
      setCourses(coursesData);
    } catch (error) {
      setSnackbar({ open: true, message: error.message, severity: 'error' });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!adminLoading) {
      if (user) fetchCourses();
      else router.push('/admin/login');
    }
  }, [adminLoading, user, router, fetchCourses]);

  const handleAccordionChange = async (courseId) => {
    if (courseDetails[courseId]) return;
    const token = localStorage.getItem('adminToken');
    try {
      const [enrollmentsData, lessonsData] = await Promise.all([
        apiRequest(`/training/admin/courses/${courseId}/enrollments`, token),
        apiRequest(`/training/admin/courses/${courseId}/lessons`, token)
      ]);
      setCourseDetails(prev => ({ ...prev, [courseId]: { enrollments: enrollmentsData, lessons: lessonsData } }));
    } catch (error) {
      setSnackbar({ open: true, message: error.message, severity: 'error' });
    }
  };

  const handleFormChange = (e) => {
    const { name, value, files } = e.target;
    setNewCourse(prev => ({ ...prev, [name]: files ? files[0] : value }));
  };

  const handleSubmitNewCourse = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    const token = localStorage.getItem('adminToken');
    const formData = new FormData();
    formData.append('title', newCourse.title);
    formData.append('description', newCourse.description);
    if (newCourse.image) formData.append('image', newCourse.image);

    try {
      await apiRequest('/training/courses', token, { method: 'POST', body: formData });
      setSnackbar({ open: true, message: 'Curso creado con éxito', severity: 'success' });
      setNewCourse({ title: '', description: '', image: null });
      fetchCourses();
    } catch (error) {
      setSnackbar({ open: true, message: error.message, severity: 'error' });
    } finally {
      setSubmitting(false);
    }
  };

  const handleOpenModal = (courseId) => {
    setSelectedCourse(courseId);
    setModalOpen(true);
  };

  const handleLessonAdded = (message, severity) => {
    setSnackbar({ open: true, message, severity });
    const courseIdToRefresh = selectedCourse || lessonToEdit?.courseId || lessonToDelete?.courseId;
    if (courseIdToRefresh) {
        setCourseDetails(prev => ({ ...prev, [courseIdToRefresh]: undefined }));
        handleAccordionChange(courseIdToRefresh);
    }
  };

  const handleDeleteClick = (course, event) => {
    event.stopPropagation();
    setCourseToDelete(course);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!courseToDelete) return;
    const token = localStorage.getItem('adminToken');
    try {
        await apiRequest(`/training/admin/courses/${courseToDelete.id}`, token, { method: 'DELETE' });
        setSnackbar({ open: true, message: `Curso "${courseToDelete.title}" eliminado con éxito`, severity: 'success' });
        fetchCourses();
    } catch (error) {
        setSnackbar({ open: true, message: error.message, severity: 'error' });
    } finally {
        setDeleteDialogOpen(false);
        setCourseToDelete(null);
    }
  };

  const handleEditLessonClick = (lesson, courseId) => {
    setLessonToEdit({ ...lesson, courseId });
    setEditModalOpen(true);
  };

  const handleDeleteLessonClick = (lesson, courseId) => {
    setLessonToDelete({ ...lesson, courseId });
    setDeleteLessonDialogOpen(true);
  };

  const handleDeleteLessonConfirm = async () => {
    if (!lessonToDelete) return;
    const token = localStorage.getItem('adminToken');
    try {
        await apiRequest(`/training/admin/lessons/${lessonToDelete.id}`, token, { method: 'DELETE' });
        handleLessonAdded(`Lección "${lessonToDelete.title}" eliminada`, 'success');
    } catch (error) {
        setSnackbar({ open: true, message: error.message, severity: 'error' });
    } finally {
        setDeleteLessonDialogOpen(false);
        setLessonToDelete(null);
    }
  };

  const handleDownloadVideo = async (lessonId) => {
    const token = localStorage.getItem('adminToken');
    try {
        const data = await apiRequest(`/training/admin/lessons/${lessonId}/signed-url`, token);
        window.open(data.url, '_blank');
    } catch (error) {
        setSnackbar({ open: true, message: `Error al obtener enlace de descarga: ${error.message}`, severity: 'error' });
    }
  };

  if (adminLoading || loading) {
    return <DashboardLayout><Container sx={{ textAlign: 'center', mt: 5 }}><CircularProgress /></Container></DashboardLayout>;
  }

  return (
    <DashboardLayout toggleDarkMode={toggleDarkMode} currentMode={currentMode}>
      <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
        <Typography variant="h4" gutterBottom>Gestión de Cursos</Typography>

        <Paper sx={{ p: 3, mb: 4 }}>
          <Typography variant="h6" gutterBottom>Crear Nuevo Curso</Typography>
          <Box component="form" onSubmit={handleSubmitNewCourse} sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <TextField name="title" label="Título del Curso" value={newCourse.title} onChange={handleFormChange} required fullWidth />
            <TextField name="description" label="Descripción" value={newCourse.description} onChange={handleFormChange} required multiline rows={3} fullWidth />
            <Button variant="contained" component="label">
              Subir Imagen de Portada
              <input name="image" type="file" hidden onChange={handleFormChange} accept="image/*" />
            </Button>
            {newCourse.image && <Typography variant="body2">Archivo seleccionado: {newCourse.image.name}</Typography>}
            <Button type="submit" variant="contained" color="primary" disabled={submitting} sx={{ alignSelf: 'flex-start' }}>
              {submitting ? <CircularProgress size={24} /> : 'Crear Curso'}
            </Button>
          </Box>
        </Paper>

        <Typography variant="h6" gutterBottom>Cursos Existentes</Typography>
        {courses.map((course) => (
          <Accordion key={course.id} onChange={() => handleAccordionChange(course.id)}>
            <AccordionSummary expandIcon={<ExpandMoreIcon />}>
              <Box sx={{ display: 'flex', alignItems: 'center', width: '100%' }}>
                <Typography sx={{ flexGrow: 1, fontWeight: '500' }}>{course.title}</Typography>
                <Typography sx={{ color: 'text.secondary', mx: 2 }}>{course.studentCount} Estudiante(s)</Typography>
                <IconButton aria-label="delete" size="small" onClick={(e) => handleDeleteClick(course, e)} sx={{ color: 'error.main' }}>
                    <DeleteIcon fontSize="inherit" />
                </IconButton>
              </Box>
            </AccordionSummary>
            <AccordionDetails sx={{ bgcolor: 'action.hover' }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Typography variant="subtitle1">Detalles del Curso</Typography>
                <Button variant="outlined" startIcon={<AddCircleOutlineIcon />} onClick={() => handleOpenModal(course.id)}>Añadir Lección</Button>
              </Box>
              <Divider sx={{ my: 2 }} />

              <Typography variant="body2" gutterBottom><strong>Descripción:</strong> {course.description}</Typography>

              <Typography variant="subtitle2" sx={{ mt: 2 }}>Lecciones</Typography>
              {courseDetails[course.id]?.lessons?.length > 0 ? (
                 <TableContainer component={Paper} sx={{ mt: 1 }}>
                    <Table size="small">
                        <TableHead><TableRow><TableCell>Orden</TableCell><TableCell>Título</TableCell><TableCell align="right">Acciones</TableCell></TableRow></TableHead>
                        <TableBody>
                            {courseDetails[course.id].lessons.map(lesson => (
                                <TableRow key={lesson.id}>
                                    <TableCell>{lesson.orderIndex}</TableCell>
                                    <TableCell>{lesson.title}</TableCell>
                                    <TableCell align="right">
                                        <Tooltip title="Editar Lección"><IconButton size="small" onClick={() => handleEditLessonClick(lesson, course.id)}><EditIcon fontSize="small" /></IconButton></Tooltip>
                                        <Tooltip title="Descargar Video"><IconButton size="small" onClick={() => handleDownloadVideo(lesson.id)}><DownloadIcon fontSize="small" /></IconButton></Tooltip>
                                        <Tooltip title="Eliminar Lección"><IconButton size="small" onClick={() => handleDeleteLessonClick(lesson, course.id)} sx={{ color: 'error.main' }}><DeleteIcon fontSize="small" /></IconButton></Tooltip>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                 </TableContainer>
              ) : <Typography variant="caption" sx={{ fontStyle: 'italic' }}>No hay lecciones en este curso.</Typography>}

              <Typography variant="subtitle2" sx={{ mt: 3 }}>Estudiantes Inscritos</Typography>
              {courseDetails[course.id]?.enrollments?.length > 0 ? (
                <TableContainer component={Paper} sx={{ mt: 1 }}><Table size="small">
                    <TableHead><TableRow><TableCell>Nombre</TableCell><TableCell>Email</TableCell><TableCell>Progreso</TableCell></TableRow></TableHead>
                    <TableBody>{courseDetails[course.id].enrollments.map((e, i) => (<TableRow key={i}><TableCell>{e.name}</TableCell><TableCell>{e.email}</TableCell><TableCell><Box sx={{ display: 'flex', alignItems: 'center' }}><Box sx={{ width: '100%', mr: 1 }}><LinearProgress variant="determinate" value={e.progress} /></Box><Box sx={{ minWidth: 35 }}><Typography variant="body2" color="text.secondary">{`${e.progress}%`}</Typography></Box></Box></TableCell></TableRow>))}</TableBody>
                </Table></TableContainer>
              ) : <Typography variant="caption" sx={{ fontStyle: 'italic' }}>No hay estudiantes inscritos.</Typography>}
              
              {!courseDetails[course.id] && <Box sx={{textAlign: 'center', my: 2}}><CircularProgress size={24} /></Box>}
            </AccordionDetails>
          </Accordion>
        ))}

        <AddLessonModal open={modalOpen} handleClose={() => setModalOpen(false)} courseId={selectedCourse} onLessonAdded={handleLessonAdded} />
        <EditLessonModal open={editModalOpen} handleClose={() => setEditModalOpen(false)} lesson={lessonToEdit} onLessonEdited={handleLessonAdded} />

        <Dialog open={deleteDialogOpen} onClose={() => setDeleteDialogOpen(false)}>
            <DialogTitle>Confirmar Eliminación</DialogTitle>
            <DialogContent><DialogContentText>¿Estás seguro de que quieres eliminar el curso &quot;<strong>{courseToDelete?.title}</strong>&quot;? Esta acción es irreversible y borrará todas sus lecciones e inscripciones.</DialogContentText></DialogContent>
            <DialogActions><Button onClick={() => setDeleteDialogOpen(false)}>Cancelar</Button><Button onClick={handleDeleteConfirm} color="error">Eliminar</Button></DialogActions>
        </Dialog>
        <Dialog open={deleteLessonDialogOpen} onClose={() => setDeleteLessonDialogOpen(false)}>
            <DialogTitle>Confirmar Eliminación de Lección</DialogTitle>
            <DialogContent><DialogContentText>¿Estás seguro de que quieres eliminar la lección &quot;<strong>{lessonToDelete?.title}</strong>&quot;? Esta acción es irreversible.</DialogContentText></DialogContent>
            <DialogActions><Button onClick={() => setDeleteLessonDialogOpen(false)}>Cancelar</Button><Button onClick={handleDeleteLessonConfirm} color="error">Eliminar</Button></DialogActions>
        </Dialog>

        <Snackbar open={snackbar.open} autoHideDuration={6000} onClose={() => setSnackbar(s => ({...s, open: false}))}>
          <Alert onClose={() => setSnackbar(s => ({...s, open: false}))} severity={snackbar.severity} sx={{ width: '100%' }} variant="filled">{snackbar.message}</Alert>
        </Snackbar>
      </Container>
    </DashboardLayout>
  );
}
