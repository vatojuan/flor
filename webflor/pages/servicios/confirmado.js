import { useRouter } from "next/router";
import { Box, Container, Typography, Button, Paper, List, ListItem, ListItemIcon, ListItemText } from "@mui/material";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import HourglassEmptyIcon from "@mui/icons-material/HourglassEmpty";

export default function ServicioConfirmado() {
  const router = useRouter();
  const { pending } = router.query;

  const isPending = pending === "1";

  return (
    <Box sx={{ bgcolor: "background.default", minHeight: "100vh", py: 8 }}>
      <Container maxWidth="sm" sx={{ textAlign: "center" }}>
        <Paper sx={{ p: 5, borderRadius: 3 }}>
          {isPending ? (
            <HourglassEmptyIcon sx={{ fontSize: 64, color: "warning.main", mb: 2 }} />
          ) : (
            <CheckCircleIcon sx={{ fontSize: 64, color: "success.main", mb: 2 }} />
          )}

          <Typography variant="h4" fontWeight={600} gutterBottom>
            {isPending ? "Pago pendiente" : "Solicitud recibida!"}
          </Typography>

          <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
            {isPending
              ? "Tu pago esta siendo procesado. Cuando se confirme, comenzaremos la busqueda."
              : "Tu pago fue confirmado. Ya estamos trabajando en tu busqueda."}
          </Typography>

          {!isPending && (
            <Box sx={{ textAlign: "left", mb: 3 }}>
              <Typography variant="h6" fontWeight={600} gutterBottom>
                Proximos pasos:
              </Typography>
              <List dense>
                {[
                  "Nuestro equipo analiza tu solicitud con IA",
                  "Buscamos candidatos en nuestra base de datos",
                  "Contactamos a los mejores perfiles",
                  "Te enviamos los candidatos interesados a tu email",
                ].map((step, i) => (
                  <ListItem key={i}>
                    <ListItemIcon sx={{ minWidth: 32 }}>
                      <CheckCircleIcon fontSize="small" color="primary" />
                    </ListItemIcon>
                    <ListItemText primary={step} />
                  </ListItem>
                ))}
              </List>
            </Box>
          )}

          <Button variant="contained" size="large" onClick={() => router.push("/")}>
            Volver al inicio
          </Button>
        </Paper>
      </Container>
    </Box>
  );
}
