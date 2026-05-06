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
} from "@mui/material";
import Link from "next/link";
import Footer from "./Footer"; // Asegúrate de que la ruta a tu componente Footer sea correcta
import WhatsAppIcon from "@mui/icons-material/WhatsApp";
import LinkedInIcon from "@mui/icons-material/LinkedIn";
import { useState } from "react";
import { useRouter } from "next/router";
import { useSession } from "next-auth/react"; // 1. Importamos useSession para manejar la lógica de autenticación

// Ícono de Instagram personalizado (sin cambios)
function InstagramIcon(props) {
  return (
    <SvgIcon {...props}>
      <path d="M7.5 2C4.46243 2 2 4.46243 2 7.5V16.5C2 19.5376 4.46243 22 7.5 22H16.5C19.5376 22 22 19.5376 22 16.5V7.5C22 4.46243 19.5376 2 16.5 2H7.5ZM12 7C14.2091 7 16 8.79086 16 11C16 13.2091 14.2091 15 12 15C9.79086 15 8 13.2091 8 11C8 8.79086 9.79086 7 12 7ZM18 6.5C18 7.32843 17.3284 8 16.5 8C15.6716 8 15 7.32843 15 6.5C15 5.67157 15.6716 5 16.5 5C17.3284 5 18 5.67157 18 6.5Z" />
    </SvgIcon>
  );
}

export default function MainLayout({ children }) {
  const router = useRouter();
  const { data: session, status } = useSession(); // 2. Obtenemos el estado de la sesión
  const [solucionesAnchor, setSolucionesAnchor] = useState(null);

  const handleSolucionesOpen = (event) => setSolucionesAnchor(event.currentTarget);
  const handleSolucionesClose = () => setSolucionesAnchor(null);
  const handleSolucionesNavigate = (path) => {
    handleSolucionesClose();
    router.push(path);
  };

  // Determina si la página actual es la de inicio para aplicar estilos diferentes a la AppBar
  const isHomePage = router.pathname === '/';

  return (
    <Box
      sx={{
        display: "flex",
        flexDirection: "column",
        minHeight: "100vh",
        // El fondo verde se aplicará en todas las páginas excepto en la de inicio, que tiene video.
        backgroundColor: isHomePage ? 'transparent' : '#103B40',
        color: "#FFFFFF",
        position: 'relative', // Necesario para que el z-index de los videos funcione correctamente
        zIndex: 1,
      }}
    >
      {/* AppBar ahora es parte del Layout general */}
      <AppBar
        position="fixed"
        sx={(theme) => ({
          // La AppBar es transparente en la home (para ver el video) y en el resto de páginas en desktop.
          // En móvil, siempre tiene un fondo semitransparente para legibilidad.
          backgroundColor: "transparent !important",
          boxShadow: "none",
          zIndex: 1100,
          [theme.breakpoints.down("sm")]: {
            backgroundColor: "rgba(16, 59, 64, 0.9) !important",
          },
        })}
      >
        <Toolbar sx={{ flexWrap: "wrap", gap: 1 }}>
          <Button component={Link} href="/nosotros" color="inherit">
            Nosotros
          </Button>
          <Button color="inherit" onClick={handleSolucionesOpen}>
            Soluciones
          </Button>

          {/* Menú Soluciones UNIFICADO */}
          <Menu
            id="soluciones-menu"
            anchorEl={solucionesAnchor}
            open={Boolean(solucionesAnchor)}
            onClose={handleSolucionesClose}
            MenuListProps={{ "aria-labelledby": "soluciones-button" }}
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

          <Button component={Link} href="/contacto" color="inherit">
            Contacto
          </Button>
          <Button
            variant="outlined"
            color="inherit"
            onClick={() => (window.location.href = "https://fapmendoza.online/cv/upload")}
          >
            Subir CV
          </Button>
          
          {/* 3. Lógica de sesión centralizada en el Layout */}
          {status === "loading" ? null : session ? (
            <Button component={Link} href="/dashboard" color="inherit">
              Dashboard
            </Button>
          ) : (
            <Button component={Link} href="/login" color="inherit">
              Ingresar
            </Button>
          )}

          <Box sx={{ ml: "auto", display: "flex", gap: 1 }}>
            <IconButton
              onClick={() => window.open("https://www.instagram.com/faprrhh", "_blank")}
              color="inherit"
            >
              <InstagramIcon />
            </IconButton>
            <IconButton
              onClick={() => window.open("https://www.linkedin.com/in/florenciaalvarezfap", "_blank")}
              color="inherit"
            >
              <LinkedInIcon />
            </IconButton>
          </Box>
        </Toolbar>
      </AppBar>

      {/* Contenido principal de cada página */}
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          // Añadimos padding superior para que el contenido no quede oculto por la AppBar fija
          pt: { xs: "72px", sm: "80px" },
        }}
      >
        {children}
      </Box>

      {/* Footer se renderiza al final */}
      <Footer />

      {/* Botón flotante de WhatsApp */}
      <Box sx={{ position: "fixed", bottom: 16, right: 16, zIndex: 1200 }}>
        <Fab
          color="success"
          aria-label="WhatsApp"
          onClick={() =>
            window.open(
              "http://api.whatsapp.com/send?phone=542622542125&text=Me+interesa+el+Servicio+de+Recursos+Humanos",
              "_blank"
            )
          }
        >
          <WhatsAppIcon />
        </Fab>
      </Box>
    </Box>
  );
}
