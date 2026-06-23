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
  Drawer,
  List,
  ListItemButton,
  ListItemText,
  ListItemIcon,
  Collapse,
  Divider,
} from "@mui/material";
import Image from "next/image";
import Link from "next/link";
import Footer from "./Footer";
import WhatsAppIcon from "@mui/icons-material/WhatsApp";
import LinkedInIcon from "@mui/icons-material/LinkedIn";
import MenuIcon from "@mui/icons-material/Menu";
import CloseIcon from "@mui/icons-material/Close";
import ExpandLess from "@mui/icons-material/ExpandLess";
import ExpandMore from "@mui/icons-material/ExpandMore";
import PersonSearchIcon from "@mui/icons-material/PersonSearch";
import UploadFileIcon from "@mui/icons-material/UploadFile";
import LoginIcon from "@mui/icons-material/Login";
import DashboardIcon from "@mui/icons-material/Dashboard";
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

// Soluciones (compartido entre el menú de escritorio y el drawer mobile)
const SOLUCIONES = [
  { label: "Recruitment Process", path: "/soluciones/recruitment" },
  { label: "Learning And Development", path: "/soluciones/learning_and_development" },
  { label: "Employer Branding & Engagement", path: "/soluciones/branding" },
  { label: "Outsourcing", path: "/soluciones/outsourcing" },
  { label: "Talent Management", path: "/soluciones/talent_management" },
];

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
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [mobileSolOpen, setMobileSolOpen] = useState(false);

  const handleSolucionesOpen = (event) => setSolucionesAnchor(event.currentTarget);
  const handleSolucionesClose = () => setSolucionesAnchor(null);
  const handleSolucionesNavigate = (path) => {
    handleSolucionesClose();
    router.push(path);
  };

  const closeDrawer = () => {
    setDrawerOpen(false);
    setMobileSolOpen(false);
  };
  const drawerNavigate = (path) => {
    closeDrawer();
    router.push(path);
  };

  const isHomePage = router.pathname === "/";

  // Item de lista reutilizable para el drawer mobile
  const drawerItemSx = {
    borderRadius: "10px",
    mb: 0.5,
    py: 1.2,
    "& .MuiListItemIcon-root": { color: "rgba(255,255,255,0.7)", minWidth: 40 },
    "& .MuiListItemText-primary": { fontSize: "1rem", fontWeight: 500 },
    "&:hover": { backgroundColor: "rgba(217, 98, 54, 0.18)" },
  };

  return (
    <Box
      sx={{
        display: "flex",
        flexDirection: "column",
        minHeight: "100vh",
        backgroundColor: isHomePage ? "transparent" : "#103B40",
        color: "#FFFFFF",
        position: "relative",
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
          [theme.breakpoints.down("md")]: {
            backgroundColor: "rgba(16, 59, 64, 0.95) !important",
          },
        })}
      >
        <Toolbar
          sx={{
            gap: { xs: 1, md: 1.5 },
            minHeight: { xs: 60, md: 70 },
          }}
        >
          {/* Logo en la navbar */}
          <Box
            component={Link}
            href="/"
            sx={{
              display: "flex",
              alignItems: "center",
              mr: { xs: 1, md: 2 },
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
              style={{ objectFit: "contain", width: "auto", height: 40 }}
            />
          </Box>

          {/* Links de navegación (solo escritorio) */}
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

          {/* Menú Soluciones (escritorio) */}
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
            {SOLUCIONES.map((s) => (
              <MenuItem key={s.path} onClick={() => handleSolucionesNavigate(s.path)}>
                {s.label}
              </MenuItem>
            ))}
          </Menu>

          {/* Espaciador flexible */}
          <Box sx={{ flexGrow: 1 }} />

          {/* Botones CTA (solo escritorio) */}
          <Box sx={{ display: { xs: "none", md: "flex" }, alignItems: "center", gap: 1.5 }}>
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
            <Box sx={{ display: "flex", ml: 1 }}>
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

          {/* CTA rápido + Hamburguesa (solo mobile) */}
          <Box sx={{ display: { xs: "flex", md: "none" }, alignItems: "center", gap: 0.5 }}>
            <Button
              variant="contained"
              component={Link}
              href="/servicios/busqueda"
              startIcon={<PersonSearchIcon sx={{ fontSize: "1.1rem !important" }} />}
              sx={{
                fontSize: "0.78rem",
                fontWeight: 600,
                px: 1.4,
                py: 0.7,
                borderRadius: "20px",
                whiteSpace: "nowrap",
                backgroundColor: "#D96236",
                color: "#fff",
                "&:hover": { backgroundColor: "#B0482B" },
              }}
            >
              Personal
            </Button>
            <IconButton
              aria-label="Abrir menú"
              edge="end"
              onClick={() => setDrawerOpen(true)}
              sx={{ color: "#fff", ml: 0.5 }}
            >
              <MenuIcon />
            </IconButton>
          </Box>
        </Toolbar>
      </AppBar>

      {/* Drawer de navegación mobile */}
      <Drawer
        anchor="right"
        open={drawerOpen}
        onClose={closeDrawer}
        ModalProps={{ keepMounted: true }}
        PaperProps={{
          sx: {
            width: { xs: "82%", sm: 340 },
            maxWidth: 360,
            backgroundColor: "#103B40",
            backgroundImage: "linear-gradient(180deg, #144349 0%, #0d2f34 100%)",
            color: "#fff",
            borderLeft: "1px solid rgba(255,255,255,0.08)",
          },
        }}
      >
        {/* Encabezado del drawer */}
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            px: 2,
            py: 1.5,
            borderBottom: "1px solid rgba(255,255,255,0.08)",
          }}
        >
          <Box component={Link} href="/" onClick={closeDrawer} sx={{ display: "flex", alignItems: "center" }}>
            <Image
              src="/images/Fap-marca-blanca(chico).png"
              alt="FAP RRHH"
              width={40}
              height={40}
              style={{ objectFit: "contain", width: "auto", height: 36 }}
            />
          </Box>
          <IconButton aria-label="Cerrar menú" onClick={closeDrawer} sx={{ color: "#fff" }}>
            <CloseIcon />
          </IconButton>
        </Box>

        <Box sx={{ px: 1.5, py: 2, display: "flex", flexDirection: "column", height: "100%" }}>
          <List sx={{ flexGrow: 1 }}>
            <ListItemButton sx={drawerItemSx} onClick={() => drawerNavigate("/nosotros")}>
              <ListItemText primary="Nosotros" />
            </ListItemButton>

            {/* Soluciones desplegable */}
            <ListItemButton sx={drawerItemSx} onClick={() => setMobileSolOpen((o) => !o)}>
              <ListItemText primary="Soluciones" />
              {mobileSolOpen ? <ExpandLess /> : <ExpandMore />}
            </ListItemButton>
            <Collapse in={mobileSolOpen} timeout="auto" unmountOnExit>
              <List disablePadding sx={{ pl: 1 }}>
                {SOLUCIONES.map((s) => (
                  <ListItemButton
                    key={s.path}
                    sx={{ ...drawerItemSx, py: 0.9, pl: 2.5 }}
                    onClick={() => drawerNavigate(s.path)}
                  >
                    <ListItemText
                      primary={s.label}
                      primaryTypographyProps={{ sx: { fontSize: "0.9rem", color: "rgba(255,255,255,0.85)" } }}
                    />
                  </ListItemButton>
                ))}
              </List>
            </Collapse>

            <ListItemButton sx={drawerItemSx} onClick={() => drawerNavigate("/contacto")}>
              <ListItemText primary="Contacto" />
            </ListItemButton>

            <Divider sx={{ my: 1.5, borderColor: "rgba(255,255,255,0.1)" }} />

            <ListItemButton sx={drawerItemSx} onClick={() => drawerNavigate("/cv/upload")}>
              <ListItemIcon><UploadFileIcon /></ListItemIcon>
              <ListItemText primary="Subir CV" />
            </ListItemButton>
            <ListItemButton sx={drawerItemSx} onClick={() => drawerNavigate("/servicios/busqueda")}>
              <ListItemIcon><PersonSearchIcon /></ListItemIcon>
              <ListItemText primary="Necesito Personal" />
            </ListItemButton>

            <Divider sx={{ my: 1.5, borderColor: "rgba(255,255,255,0.1)" }} />

            {status === "loading" ? null : session ? (
              <ListItemButton sx={drawerItemSx} onClick={() => drawerNavigate("/dashboard")}>
                <ListItemIcon><DashboardIcon /></ListItemIcon>
                <ListItemText primary="Dashboard" />
              </ListItemButton>
            ) : (
              <ListItemButton sx={drawerItemSx} onClick={() => drawerNavigate("/login")}>
                <ListItemIcon><LoginIcon /></ListItemIcon>
                <ListItemText primary="Ingresar" />
              </ListItemButton>
            )}
          </List>

          {/* CTA principal del drawer */}
          <Button
            fullWidth
            variant="contained"
            component={Link}
            href="/servicios/busqueda"
            onClick={closeDrawer}
            startIcon={<PersonSearchIcon />}
            sx={{
              mt: 1,
              py: 1.3,
              borderRadius: "12px",
              fontWeight: 600,
              fontSize: "1rem",
              backgroundColor: "#D96236",
              "&:hover": { backgroundColor: "#B0482B" },
            }}
          >
            Necesito Personal
          </Button>

          {/* Redes sociales en el drawer */}
          <Box sx={{ display: "flex", justifyContent: "center", gap: 1, mt: 2, mb: 1 }}>
            <IconButton
              aria-label="Instagram"
              onClick={() => window.open("https://www.instagram.com/faprrhh", "_blank")}
              sx={{ color: "rgba(255,255,255,0.8)", "&:hover": { color: "#D96236" } }}
            >
              <InstagramIcon />
            </IconButton>
            <IconButton
              aria-label="LinkedIn"
              onClick={() => window.open("https://www.linkedin.com/in/florenciaalvarezfap", "_blank")}
              sx={{ color: "rgba(255,255,255,0.8)", "&:hover": { color: "#D96236" } }}
            >
              <LinkedInIcon />
            </IconButton>
          </Box>
        </Box>
      </Drawer>

      {/* Contenido principal */}
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          pt: { xs: "60px", md: "70px" },
        }}
      >
        {children}
      </Box>

      {!isHomePage && <Footer />}

      {/* Botón flotante de WhatsApp con animación */}
      <Box sx={{ position: "fixed", bottom: { xs: 16, md: 24 }, right: { xs: 16, md: 24 }, zIndex: 1200 }}>
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
              width: { xs: 52, md: 60 },
              height: { xs: 52, md: 60 },
              boxShadow: "0 4px 20px rgba(37, 211, 102, 0.4)",
              transition: "all 0.3s ease",
              "&:hover": {
                transform: "scale(1.1)",
                boxShadow: "0 6px 28px rgba(37, 211, 102, 0.5)",
              },
            }}
          >
            <WhatsAppIcon sx={{ fontSize: { xs: 26, md: 30 } }} />
          </Fab>
        </Tooltip>
      </Box>
    </Box>
  );
}
