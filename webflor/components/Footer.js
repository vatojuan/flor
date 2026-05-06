import Image from "next/image";
import { useTheme } from "@mui/material/styles";
import { Box, Container, Typography, Link } from "@mui/material";

export default function Footer() {
  const theme = useTheme();
  const isDarkMode = theme.palette.mode === "dark";

  return (
    <Box sx={{ bgcolor: theme.palette.background.paper, py: 2, mt: 4, textAlign: "center" }}>
      <Container maxWidth="lg">
        <Image
          src={isDarkMode ? "/images/Fap rrhh circular-marca-naranja(chico).png" : "/images/Fap rrhh circular-marca-naranja(chico).png"}
          alt="Logo de la empresa"
          width={80}
          height={80}
          priority
        />
        <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
          © {new Date().getFullYear()} Fap Mendoza. Todos los derechos reservados.
        </Typography>
        <Box sx={{ mt: 1 }}>
          <Link href="/contacto" sx={{ mx: 2, color: "primary.main", textDecoration: "none" }}>
            Contacto
          </Link>
          <Link href="/terminos" sx={{ mx: 2, color: "primary.main", textDecoration: "none" }}>
            Términos y Condiciones
          </Link>
        </Box>
      </Container>
    </Box>
  );
}
