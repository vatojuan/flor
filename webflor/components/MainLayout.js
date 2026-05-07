// components/MainLayout.js
import {
  Box,
  AppBar,
  Toolbar,
  Button,
  IconButton,
  Menu,
  MenuItem,
  SvgIcon,
  Fab,
  Tooltip,
} from "@mui/material";
import Image from "next/image";
import Link from "next/link";
import Footer from "./Footer";
import WhatsAppIcon from "@mui/icons-material/WhatsApp";
import LinkedInIcon from "@mui/icons-material/LinkedIn";
import { useState } from "react";
import { useRouter } from "next/router";
import { useSession } from "next-auth/react";

// Ícono de Instagram personalizado
function InstagramIcon(props) {
  return (
    <SvgIcon {...props}>
      <path d="M7.5 2C4.46243 2 2 4.46243 2 7.5V16.5C2 19.5376 4.46243 22 7.5 22H16.5C19.5376 22 22 19.5376 22 16.5V7.5C22 4.46243 19.5376 2 16.5 2H7.5ZM12 7C14.2091 7 16 8.79086 16 11C16 13.2091 14.2091 15 12 15C9.79086 15 8 13.2091 8 11C8 8.79086 9.79086 7 12 7ZM18 6.5C18 7.32843 17.3284 8 16.5 8C15.6716 8 15 7.32843 15 6.5C15 5.67157 15.6716 5 16.5 5C17.3284 5 18 5.67157 18 6.5Z" />
    </SvgIcon>
  );
}

// Estilos comunes para links de navegación
const navLinkSx = {
  color: "inherit",
  fontSize: "0.95rem",
  fontWeight: 500,
  position: "relative",
  px: 1.5,
  py: 1,
  borderRadius: "8px",
  transition: "all 0.2s ease",
  "&:hover": {
    backgroundColor: "rgba(255,255,255,0.1)",
  },
  "&::after": {
    content: '""',
    position: "absolute",
    bottom: 4,
    left: "50%",
    transform: "translateX(-50%) scaleX(0)",
    width: "60%",
    height: "2px",
    backgroundColor: "#D96236",
    transition: "transform 0.25s ease",
    borderRadius: "1px",
  },
  "&:hover::after": {
    transform: "translateX(-50%) scaleX(1)",
  },
};

// Estilos para botones CTA destacados
const ctaButtonSx = {
  fontSize: "0.9rem",
  fontWeight: 600,
  px: 2.5,
  py: 0.8,
  borderRadius: "24px",
  transition: "all 0.25s ease",
  borderWidth: "2px",
  "&:hover": {
    borderWidth: "2px",
    transform: "translateY(-1px)",
    boxShadow: "0 4px 12px rgba(217, 98, 54, 0.3)",
  },
};

export default function MainLayout({ children }) {
  const router = useRouter();
  const { data: session, status } = useSession();
  const [solucionesAnchor, setSolucionesAnchor] = useState(null);

  const handleSolucionesOpen = (event) => setSolucionesAnchor(event.currentTarget);
  const handleSolucionesClose = () => setSolucionesAnchor(null);
  const handleSolucionesNavigate = (path) => {
    handleSolucionesClose();
    router.push(path);
  };

  const isHomePage = router.pathname === '/';

  return (
    <Box
      sx={{
        display: "flex",
        flexDirection: "column",
        minHeight: "100vh",
        backgroundColor: isHomePage ? 'transparent' : '#103B40',
        color: "#FFFFFF",
        position: 'relative',
        zIndex: 1,
      }}
    >
      {/* AppBar con backdrop blur moderno */}
      <AppBar
        position="fixed"
        sx={(theme) => ({
          backgroundColor: "rgba(16, 59, 64, 0.6) !important",
          backdropFilter: "blur(12px)",
          WebkitBackdropFilter: "blur(12px)",
          boxShadow: "0 1px 0 rgba(255,255,255,0.08)",
          borderBottom: "1px solid rgba(255,255,255,0.06)",
          zIndex: 1100,
          transition: "all 0.3s ease",
          [theme.breakpoints.down("sm")]: {
            backgroundColor: "rgba(16, 59, 64, 0.92) !important",
          },
        })}
      >
        <Toolbar
          sx={{
            gap: { xs: 0.5, sm: 1.5 },
            py: 0.5,
            minHeight: { xs: 64, sm: 70 },
          }}
        >
          {/* Logo en la navbar */}
          <Box
            component={Link}
            href="/"
            sx={{
              display: "flex",
              alignItems: "center",
              mr: { xs: 1, sm: 2 },
              flexShrink: 0,
              transition: "opacity 0.2s ease",
              "&:hover": { opacity: 0.85 },
            }}
          >
            <Image
              src="/images/Fap-marca-blanca(chico).png"
              alt="FAP RRHH"
              width={44}
              height={44}
              style={{ objectFit: "contain" }}
            />
          </Box>

          {/* Links de navegación */}
          <Box sx={{ display: { xs: "none", md: "flex" }, alignItems: "center", gap: 0.5 }}>
            <Button component={Link} href="/nosotros" sx={navLinkSx}>
              Nosotros
            </Button>
            <Button sx={navLinkSx} onClick={handleSolucionesOpen}>
              Soluciones
            </Button>
            <Button component={Link} href="/contacto" sx={navLinkSx}>
              Contacto
            </Button>
          </Box>

          {/* Menú Soluciones */}
          <Menu
            id="soluciones-menu"
            anchorEl={solucionesAnchor}
            open={Boolean(solucionesAnchor)}
            onClose={handleSolucionesClose}
            MenuListProps={{ "aria-labelledby": "soluciones-button" }}
            slotProps={{
              paper: {
                sx: {
                  mt: 1,
                  borderRadius: "12px",
                  backdropFilter: "blur(16px)",
                  backgroundColor: "rgba(16, 59, 64, 0.95)",
                  border: "1px solid rgba(255,255,255,0.1)",
                  boxShadow: "0 8px 32px rgba(0,0,0,0.3)",
                  "& .MuiMenuItem-root": {
                    color: "#fff",
                    fontSize: "0.95rem",
                    py: 1.2,
                    px: 2.5,
                    borderRadius: "8px",
                    mx: 0.5,
                    transition: "all 0.2s ease",
                    "&:hover": {
                      backgroundColor: "rgba(217, 98, 54, 0.2)",
                    },
                  },
                },
              },
            }}
          >
            <MenuItem onClick={() => handleSolucionesNavigate("/soluciones/recruitment")}>
              Recruitment Process
            </MenuItem>
            <MenuItem onClick={() => handleSolucionesNavigate("/soluciones/learning_and_development")}>
              Learning And Development
            </MenuItem>
            <MenuItem onClick={() => handleSolucionesNavigate("/soluciones/branding")}>
              Employer Branding & Engagement
            </MenuItem>
            <MenuItem onClick={() => handleSolucionesNavigate("/soluciones/outsourcing")}>
              Outsourcing
            </MenuItem>
            <MenuItem onClick={() => handleSolucionesNavigate("/soluciones/talent_management")}>
              Talent Management
            </MenuItem>
          </Menu>

          {/* Espaciador flexible */}
          <Box sx={{ flexGrow: 1 }} />

          {/* Botones CTA */}
          <Box sx={{ display: "flex", alignItems: "center", gap: { xs: 0.5, sm: 1.5 } }}>
            <Button
              variant="outlined"
              component={Link}
              href="/cv/upload"
              sx={{
                ...ctaButtonSx,
                color: "#fff",
                borderColor: "rgba(255,255,255,0.5)",
                "&:hover": {
                  ...ctaButtonSx["&:hover"],
                  borderColor: "#fff",
                  backgroundColor: "rgba(255,255,255,0.08)",
                },
                display: { xs: "none", sm: "inline-flex" },
              }}
            >
              Subir CV
            </Button>
            <Button
              variant="contained"
              component={Link}
              href="/servicios/busqueda"
              sx={{
                ...ctaButtonSx,
                backgroundColor: "#D96236",
                color: "#fff",
                border: "2px solid #D96236",
                "&:hover": {
                  ...ctaButtonSx["&:hover"],
                  backgroundColor: "#B0482B",
                  borderColor: "#B0482B",
                },
                display: { xs: "none", sm: "inline-flex" },
              }}
            >
              Necesito Personal
            </Button>

            {/* Login / Dashboard */}
            {status === "loading" ? null : session ? (
              <Button component={Link} href="/dashboard" sx={navLinkSx}>
                Dashboard
              </Button>
            ) : (
              <Button component={Link} href="/login" sx={navLinkSx}>
                Ingresar
              </Button>
            )}

            {/* Redes sociales */}
            <Box sx={{ display: "flex", ml: { xs: 0, sm: 1 } }}>
              <Tooltip title="Instagram" arrow>
                <IconButton
                  onClick={() => window.open("https://www.instagram.com/faprrhh", "_blank")}
                  color="inherit"
                  sx={{
                    transition: "all 0.2s ease",
                    "&:hover": { backgroundColor: "rgba(217, 98, 54, 0.2)", transform: "scale(1.1)" },
                  }}
                >
                  <InstagramIcon />
                </IconButton>
              </Tooltip>
              <Tooltip title="LinkedIn" arrow>
                <IconButton
                  onClick={() => window.open("https://www.linkedin.com/in/florenciaalvarezfap", "_blank")}
                  color="inherit"
                  sx={{
                    transition: "all 0.2s ease",
                    "&:hover": { backgroundColor: "rgba(217, 98, 54, 0.2)", transform: "scale(1.1)" },
                  }}
                >
                  <LinkedInIcon />
                </IconButton>
              </Tooltip>
            </Box>
          </Box>

          {/* Links de navegación para mobile (debajo del toolbar) */}
          <Box
            sx={{
              display: { xs: "flex", md: "none" },
              width: "100%",
              justifyContent: "center",
              gap: 0.5,
              mt: 0.5,
              pb: 0.5,
            }}
          >
            <Button component={Link} href="/nosotros" sx={{ ...navLinkSx, fontSize: "0.85rem", px: 1 }}>
              Nosotros
            </Button>
            <Button sx={{ ...navLinkSx, fontSize: "0.85rem", px: 1 }} onClick={handleSolucionesOpen}>
              Soluciones
            </Button>
            <Button component={Link} href="/contacto" sx={{ ...navLinkSx, fontSize: "0.85rem", px: 1 }}>
              Contacto
            </Button>
            <Button
              component={Link}
              href="/cv/upload"
              sx={{ ...navLinkSx, fontSize: "0.85rem", px: 1, color: "#D96236" }}
            >
              Subir CV
            </Button>
            <Button
              component={Link}
              href="/servicios/busqueda"
              sx={{ ...navLinkSx, fontSize: "0.85rem", px: 1, color: "#D96236" }}
            >
              Personal
            </Button>
          </Box>
        </Toolbar>
      </AppBar>

      {/* Contenido principal */}
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          pt: { xs: "110px", md: "80px" },
        }}
      >
        {children}
      </Box>

      {!isHomePage && <Footer />}

      {/* Botón flotante de WhatsApp con animación */}
      <Box sx={{ position: "fixed", bottom: 24, right: 24, zIndex: 1200 }}>
        <Tooltip title="Chateá con nosotros" placement="left" arrow>
          <Fab
            color="success"
            aria-label="WhatsApp"
            onClick={() =>
              window.open(
                "http://api.whatsapp.com/send?phone=542622542125&text=Me+interesa+el+Servicio+de+Recursos+Humanos",
                "_blank"
              )
            }
            sx={{
              width: 60,
              height: 60,
              boxShadow: "0 4px 20px rgba(37, 211, 102, 0.4)",
              transition: "all 0.3s ease",
              "&:hover": {
                transform: "scale(1.1)",
                boxShadow: "0 6px 28px rgba(37, 211, 102, 0.5)",
              },
            }}
          >
            <WhatsAppIcon sx={{ fontSize: 30 }} />
          </Fab>
        </Tooltip>
      </Box>
    </Box>
  );
}
