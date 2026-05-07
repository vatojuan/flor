import { useRouter } from "next/router";
import { Container, Typography, Button, Paper } from "@mui/material";
import ErrorOutlineIcon from "@mui/icons-material/ErrorOutline";

export default function PaymentFailure() {
  const router = useRouter();

  return (
    <Container maxWidth="sm" sx={{ mt: 8, textAlign: "center" }}>
      <Paper sx={{ p: 5, borderRadius: 3 }}>
        <ErrorOutlineIcon sx={{ fontSize: 64, color: "error.main", mb: 2 }} />
        <Typography variant="h4" fontWeight={600} gutterBottom>
          Pago rechazado
        </Typography>
        <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
          No se pudo procesar el pago. Tu oferta fue creada como publicacion gratuita.
          Podes intentar pagar nuevamente desde Mis Ofertas.
        </Typography>
        <Button variant="contained" size="large" onClick={() => router.push("/job-list")}>
          Ver mis ofertas
        </Button>
      </Paper>
    </Container>
  );
}
