import Link from "next/link";
import { Box, Container, Typography, Button } from "@mui/material";

export default function Terminos() {
  return (
    <Box sx={{ minHeight: "100vh", bgcolor: "background.default", py: 4 }}>
      <Container maxWidth="md">
        <Typography variant="h3" gutterBottom align="center">
          Términos y Condiciones
        </Typography>
        <Typography variant="body1" paragraph>
          Estos Términos y Condiciones rigen el uso de esta plataforma. Al acceder y utilizar este sitio, usted acepta estos términos en su totalidad.
        </Typography>
        <Typography variant="h5" gutterBottom>
          1. Uso del Sitio
        </Typography>
        <Typography variant="body1" paragraph>
          Usted se compromete a utilizar esta plataforma de manera responsable y conforme a las leyes aplicables. No se permite el uso indebido o fraudulento del sitio.
        </Typography>
        <Typography variant="h5" gutterBottom>
          2. Propiedad Intelectual
        </Typography>
        <Typography variant="body1" paragraph>
          Todo el contenido, incluidos textos, gráficos y diseños, es propiedad de la empresa y está protegido por las leyes de propiedad intelectual.
        </Typography>
        <Typography variant="h5" gutterBottom>
          3. Limitación de Responsabilidad
        </Typography>
        <Typography variant="body1" paragraph>
          La empresa no será responsable por daños directos, indirectos o consecuentes que puedan derivarse del uso de esta plataforma.
        </Typography>
        <Typography variant="h5" gutterBottom>
          4. Modificaciones a los Términos
        </Typography>
        <Typography variant="body1" paragraph>
          Nos reservamos el derecho de modificar estos Términos y Condiciones en cualquier momento. Las modificaciones serán efectivas una vez publicadas en el sitio.
        </Typography>
        <Typography variant="h5" gutterBottom>
          5. Contacto
        </Typography>
        <Typography variant="body1" paragraph>
          Si tiene alguna pregunta sobre estos términos, puede contactarnos a través de nuestro formulario de contacto.
        </Typography>
        <Box sx={{ textAlign: "center", mt: 4 }}>
          <Button variant="contained" component={Link} href="/" color="primary">
            Volver a Inicio
          </Button>
        </Box>
      </Container>
    </Box>
  );
}
