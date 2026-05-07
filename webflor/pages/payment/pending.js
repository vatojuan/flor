import { useRouter } from "next/router";
import { Container, Typography, Button, Paper } from "@mui/material";
import HourglassEmptyIcon from "@mui/icons-material/HourglassEmpty";

export default function PaymentPending() {
  const router = useRouter();

  return (
    <Container maxWidth="sm" sx={{ mt: 8, textAlign: "center" }}>
      <Paper sx={{ p: 5, borderRadius: 3 }}>
        <HourglassEmptyIcon sx={{ fontSize: 64, color: "warning.main", mb: 2 }} />
        <Typography variant="h4" fontWeight={600} gutterBottom>
          Pago pendiente
        </Typography>
        <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
          Tu pago esta siendo procesado. Cuando se confirme, tu oferta sera destacada
          automaticamente y se notificara a los candidatos.
        </Typography>
        <Button variant="contained" size="large" onClick={() => router.push("/dashboard")}>
          Ir al panel
        </Button>
      </Paper>
    </Container>
  );
}
