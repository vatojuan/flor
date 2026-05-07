import Image from "next/image";
import { Box, Container, Typography, Link, IconButton, Tooltip } from "@mui/material";
import LinkedInIcon from "@mui/icons-material/LinkedIn";

export default function Footer() {
  return (
    <Box
      sx={{
        background: "linear-gradient(180deg, rgba(16,59,64,0.95) 0%, rgba(10,38,42,1) 100%)",
        py: 2.5,
        mt: 4,
        borderTop: "1px solid rgba(217, 98, 54, 0.2)",
      }}
    >
      <Container
        maxWidth="lg"
        sx={{
          display: "flex",
          flexDirection: { xs: "column", sm: "row" },
          alignItems: "center",
          justifyContent: "space-between",
          gap: { xs: 2, sm: 0 },
        }}
      >
        {/* Logo + copyright */}
        <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
          <Image
            src="/images/Fap rrhh circular-marca-naranja(chico).png"
            alt="Logo"
            width={36}
            height={36}
            priority
          />
          <Typography variant="body2" sx={{ color: "rgba(255,255,255,0.4)", fontSize: "0.8rem" }}>
            © {new Date().getFullYear()} Fap Mendoza
          </Typography>
        </Box>

        {/* Links */}
        <Box sx={{ display: "flex", gap: { xs: 2, sm: 3 }, alignItems: "center", flexWrap: "wrap", justifyContent: "center" }}>
          {[
            { label: "Necesito Personal", href: "/servicios/busqueda" },
            { label: "Contacto", href: "/contacto" },
            { label: "Términos", href: "/terminos" },
          ].map((link) => (
            <Link
              key={link.href}
              href={link.href}
              sx={{
                color: "rgba(255,255,255,0.55)",
                textDecoration: "none",
                fontSize: "0.8rem",
                transition: "color 0.2s ease",
                "&:hover": { color: "#D96236" },
              }}
            >
              {link.label}
            </Link>
          ))}
        </Box>

        {/* Redes */}
        <Box sx={{ display: "flex", gap: 0.5 }}>
          <Tooltip title="Instagram" arrow>
            <IconButton
              size="small"
              onClick={() => window.open("https://www.instagram.com/faprrhh", "_blank")}
              sx={{
                color: "rgba(255,255,255,0.5)",
                transition: "color 0.2s ease",
                "&:hover": { color: "#D96236", backgroundColor: "transparent" },
              }}
            >
              <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor">
                <path d="M7.5 2C4.46243 2 2 4.46243 2 7.5V16.5C2 19.5376 4.46243 22 7.5 22H16.5C19.5376 22 22 19.5376 22 16.5V7.5C22 4.46243 19.5376 2 16.5 2H7.5ZM12 7C14.2091 7 16 8.79086 16 11C16 13.2091 14.2091 15 12 15C9.79086 15 8 13.2091 8 11C8 8.79086 9.79086 7 12 7ZM18 6.5C18 7.32843 17.3284 8 16.5 8C15.6716 8 15 7.32843 15 6.5C15 5.67157 15.6716 5 16.5 5C17.3284 5 18 5.67157 18 6.5Z" />
              </svg>
            </IconButton>
          </Tooltip>
          <Tooltip title="LinkedIn" arrow>
            <IconButton
              size="small"
              onClick={() => window.open("https://www.linkedin.com/in/florenciaalvarezfap", "_blank")}
              sx={{
                color: "rgba(255,255,255,0.5)",
                transition: "color 0.2s ease",
                "&:hover": { color: "#D96236", backgroundColor: "transparent" },
              }}
            >
              <LinkedInIcon sx={{ fontSize: 18 }} />
            </IconButton>
          </Tooltip>
        </Box>
      </Container>
    </Box>
  );
}
