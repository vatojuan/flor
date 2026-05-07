import { useRouter } from "next/router";
import { Box, Container, Typography, Button, Paper } from "@mui/material";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";

export default function PaymentSuccess() {
  const router = useRouter();

  return (
    <Container maxWidth="sm" sx={{ mt: 8, textAlign: "center" }}>
      <Paper sx={{ p: 5, borderRadius: 3 }}>
        <CheckCircleIcon sx={{ fontSize: 64, color: "success.main", mb: 2 }} />
        <Typography variant="h4" fontWeight={600} gutterBottom>
          Pago exitoso
        </Typography>
        <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
          Tu oferta ha sido destacada. Se enviara automaticamente a los candidatos
          que matchean con el perfil solicitado.
        </Typography>
        <Button variant="contained" size="large" onClick={() => router.push("/job-list")}>
          Ver mis ofertas
        </Button>
      </Paper>
    </Container>
  );
}
