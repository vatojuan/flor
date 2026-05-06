import React from "react";
import { Box, Card, CardContent, Typography, Grid, Accordion, AccordionSummary, AccordionDetails, List, ListItem } from "@mui/material";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import DashboardLayout from "../../components/DashboardLayout";
import useAdminAuth from "../../hooks/useAdminAuth";

export default function AdminDashboard({ toggleDarkMode, currentMode }) {
  // Validar autenticación de administrador
  useAdminAuth();

  // Datos de ejemplo para métricas y matchings (posteriormente se integrarán datos reales)
  const metricsData = {
    usuarios: 120,
    postulaciones: 85,
    ofertas: 40,
    matchings: 30,
    propuestas: 25,
  };

  const matchingData = {
    avanzadas: 5,
    enProceso: 3,
  };

  // Datos de ejemplo para logs
  const logsGroup1 = [
    "Contacto: Juan Pérez - 2025-03-13 10:00",
    "Avance propuesta: Propuesta A actualizada",
    "Pago realizado: $200 - 2025-03-12",
    "Petición especial: Cambio de horario",
    "Integración API externa: Éxito",
    "Seguro: Renovado",
    "Entrevista con IA: Finalizada",
  ];

  const logsGroup2 = [
    "Registro: María González",
    "Postulación: Oferta X por Carlos",
    "Nueva Oferta: Desarrollador React",
  ];

  return (
    <DashboardLayout toggleDarkMode={toggleDarkMode} currentMode={currentMode}>
      <Box sx={{ mb: 3 }}>
        <Typography variant="h4" gutterBottom>
          Dashboard Administrativo
        </Typography>
        <Typography variant="subtitle1" color="textSecondary">
          Ruta protegida para administradores, bienvenido support@fapmendoza.com
        </Typography>
      </Box>
      <Grid container spacing={3}>
        {/* Tarjeta de datos de la base de datos */}
        <Grid item xs={12} md={6}>
          <Card elevation={3}>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Datos de la Base de Datos
              </Typography>
              <Typography variant="body1">Usuarios: {metricsData.usuarios}</Typography>
              <Typography variant="body1">Postulaciones: {metricsData.postulaciones}</Typography>
              <Typography variant="body1">Ofertas: {metricsData.ofertas}</Typography>
              <Typography variant="body1">Matchings: {metricsData.matchings}</Typography>
              <Typography variant="body1">Propuestas: {metricsData.propuestas}</Typography>
            </CardContent>
          </Card>
        </Grid>
        {/* Tarjeta de matchings en proceso */}
        <Grid item xs={12} md={6}>
          <Card elevation={3}>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Matchings en Proceso
              </Typography>
              <Typography variant="body1">Avanzadas: {matchingData.avanzadas}</Typography>
              <Typography variant="body1">En Proceso: {matchingData.enProceso}</Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
      {/* Secciones desplegables para logs */}
      <Box sx={{ mt: 4 }}>
        <Accordion>
          <AccordionSummary expandIcon={<ExpandMoreIcon />} aria-controls="logs1-content" id="logs1-header">
            <Typography variant="h6">Logs - Contactos, Avances, Pagos, Peticiones y Más</Typography>
          </AccordionSummary>
          <AccordionDetails>
            <List>
              {logsGroup1.map((log, index) => (
                <ListItem key={index}>
                  <Typography variant="body2">{log}</Typography>
                </ListItem>
              ))}
            </List>
          </AccordionDetails>
        </Accordion>
        <Accordion sx={{ mt: 2 }}>
          <AccordionSummary expandIcon={<ExpandMoreIcon />} aria-controls="logs2-content" id="logs2-header">
            <Typography variant="h6">Logs - Registro, Postulaciones y Ofertas</Typography>
          </AccordionSummary>
          <AccordionDetails>
            <List>
              {logsGroup2.map((log, index) => (
                <ListItem key={index}>
                  <Typography variant="body2">{log}</Typography>
                </ListItem>
              ))}
            </List>
          </AccordionDetails>
        </Accordion>
      </Box>
    </DashboardLayout>
  );
}
