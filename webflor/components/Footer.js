import Image from "next/image";
import { useTheme } from "@mui/material/styles";
import { Box, Container, Typography, Link, IconButton, Tooltip } from "@mui/material";
import LinkedInIcon from "@mui/icons-material/LinkedIn";

export default function Footer() {
  const theme = useTheme();

  return (
    <Box
      sx={{
        background: "linear-gradient(180deg, rgba(16,59,64,0.95) 0%, rgba(10,38,42,1) 100%)",
        pt: 5,
        pb: 3,
        mt: 4,
        borderTop: "1px solid rgba(217, 98, 54, 0.3)",
      }}
    >
      <Container maxWidth="lg">
        {/* Layout en columnas */}
        <Box
          sx={{
            display: "flex",
            flexDirection: { xs: "column", sm: "row" },
            alignItems: { xs: "center", sm: "flex-start" },
            justifyContent: "space-between",
            gap: 4,
            mb: 4,
          }}
        >
          {/* Logo y marca */}
          <Box sx={{ textAlign: { xs: "center", sm: "left" } }}>
            <Image
              src="/images/Fap rrhh circular-marca-naranja(chico).png"
              alt="Logo de la empresa"
              width={70}
              height={70}
              priority
            />
            <Typography
              variant="body2"
              sx={{ color: "rgba(255,255,255,0.5)", mt: 1.5, fontSize: "0.9rem" }}
            >
              Soluciones integrales en
              <br />
              Recursos Humanos
            </Typography>
          </Box>

          {/* Links rápidos */}
          <Box
            sx={{
              display: "flex",
              flexDirection: "column",
              gap: 1.2,
              textAlign: { xs: "center", sm: "left" },
            }}
          >
            <Typography
              variant="body2"
              sx={{
                color: "#D96236",
                fontWeight: 700,
                fontSize: "0.85rem",
                textTransform: "uppercase",
                letterSpacing: "0.1em",
                mb: 0.5,
              }}
            >
              Enlaces
            </Typography>
            {[
              { label: "Necesito Personal", href: "/servicios/busqueda" },
              { label: "Contacto", href: "/contacto" },
              { label: "Términos y Condiciones", href: "/terminos" },
            ].map((link) => (
              <Link
                key={link.href}
                href={link.href}
                sx={{
                  color: "rgba(255,255,255,0.7)",
                  textDecoration: "none",
                  fontSize: "0.95rem",
                  transition: "all 0.2s ease",
                  "&:hover": {
                    color: "#D96236",
                    paddingLeft: "4px",
                  },
                }}
              >
                {link.label}
              </Link>
            ))}
          </Box>

          {/* Redes sociales */}
          <Box sx={{ textAlign: { xs: "center", sm: "right" } }}>
            <Typography
              variant="body2"
              sx={{
                color: "#D96236",
                fontWeight: 700,
                fontSize: "0.85rem",
                textTransform: "uppercase",
                letterSpacing: "0.1em",
                mb: 1,
              }}
            >
              Seguinos
            </Typography>
            <Box sx={{ display: "flex", gap: 1, justifyContent: { xs: "center", sm: "flex-end" } }}>
              <Tooltip title="Instagram" arrow>
                <IconButton
                  onClick={() => window.open("https://www.instagram.com/faprrhh", "_blank")}
                  sx={{
                    color: "rgba(255,255,255,0.7)",
                    border: "1px solid rgba(255,255,255,0.15)",
                    transition: "all 0.2s ease",
                    "&:hover": {
                      color: "#D96236",
                      borderColor: "#D96236",
                      backgroundColor: "rgba(217, 98, 54, 0.1)",
                    },
                  }}
                >
                  <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
                    <path d="M7.5 2C4.46243 2 2 4.46243 2 7.5V16.5C2 19.5376 4.46243 22 7.5 22H16.5C19.5376 22 22 19.5376 22 16.5V7.5C22 4.46243 19.5376 2 16.5 2H7.5ZM12 7C14.2091 7 16 8.79086 16 11C16 13.2091 14.2091 15 12 15C9.79086 15 8 13.2091 8 11C8 8.79086 9.79086 7 12 7ZM18 6.5C18 7.32843 17.3284 8 16.5 8C15.6716 8 15 7.32843 15 6.5C15 5.67157 15.6716 5 16.5 5C17.3284 5 18 5.67157 18 6.5Z" />
                  </svg>
                </IconButton>
              </Tooltip>
              <Tooltip title="LinkedIn" arrow>
                <IconButton
                  onClick={() => window.open("https://www.linkedin.com/in/florenciaalvarezfap", "_blank")}
                  sx={{
                    color: "rgba(255,255,255,0.7)",
                    border: "1px solid rgba(255,255,255,0.15)",
                    transition: "all 0.2s ease",
                    "&:hover": {
                      color: "#D96236",
                      borderColor: "#D96236",
                      backgroundColor: "rgba(217, 98, 54, 0.1)",
                    },
                  }}
                >
                  <LinkedInIcon sx={{ fontSize: 20 }} />
                </IconButton>
              </Tooltip>
            </Box>
          </Box>
        </Box>

        {/* Línea divisora y copyright */}
        <Box
          sx={{
            borderTop: "1px solid rgba(255,255,255,0.1)",
            pt: 2.5,
            textAlign: "center",
          }}
        >
          <Typography variant="body2" sx={{ color: "rgba(255,255,255,0.4)", fontSize: "0.85rem" }}>
            © {new Date().getFullYear()} Fap Mendoza. Todos los derechos reservados.
          </Typography>
        </Box>
      </Container>
    </Box>
  );
}
