import React, { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { useTheme, styled, alpha } from "@mui/material/styles";
import { useSession } from "next-auth/react";
import {
  AppBar,
  Toolbar,
  Box,
  Drawer as MuiDrawer,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Divider,
  IconButton,
  Tooltip,
  Typography,
} from "@mui/material";
import DashboardIcon from "@mui/icons-material/Dashboard";
import PersonIcon from "@mui/icons-material/Person";
import PostAddIcon from "@mui/icons-material/PostAdd";
import ListAltIcon from "@mui/icons-material/ListAlt";
import WorkIcon from "@mui/icons-material/Work";
import SchoolIcon from "@mui/icons-material/School";
import Brightness4Icon from "@mui/icons-material/Brightness4";
import Brightness7Icon from "@mui/icons-material/Brightness7";
import ChevronLeftIcon from "@mui/icons-material/ChevronLeft";
import ChevronRightIcon from "@mui/icons-material/ChevronRight";
import Footer from "./Footer";

const drawerWidth = 260;
const collapsedWidth = 72;

const openedMixin = (theme) => ({
  width: drawerWidth,
  transition: theme.transitions.create("width", {
    easing: theme.transitions.easing.sharp,
    duration: theme.transitions.duration.enteringScreen,
  }),
  overflowX: "hidden",
});

const closedMixin = (theme) => ({
  width: collapsedWidth,
  transition: theme.transitions.create("width", {
    easing: theme.transitions.easing.sharp,
    duration: theme.transitions.duration.leavingScreen,
  }),
  overflowX: "hidden",
});

const DrawerHeader = styled("div")(({ theme }) => ({
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  padding: theme.spacing(0, 1),
  ...theme.mixins.toolbar,
}));

const Drawer = styled(MuiDrawer, {
  shouldForwardProp: (prop) => prop !== "open",
})(({ theme, open, drawerbg }) => ({
  width: drawerWidth,
  flexShrink: 0,
  whiteSpace: "nowrap",
  position: "fixed",
  height: "100vh",
  "& .MuiDrawer-paper": {
    backgroundColor: drawerbg,
    color: "#fff",
    borderRight: "1px solid rgba(255,255,255,0.06)",
    ...(open ? openedMixin(theme) : closedMixin(theme)),
  },
}));

const Main = styled("main", {
  shouldForwardProp: (prop) => prop !== "open",
})(({ theme, open }) => ({
  flexGrow: 1,
  marginLeft: open ? drawerWidth : collapsedWidth,
  transition: theme.transitions.create(["margin", "width"], {
    easing: theme.transitions.easing.sharp,
    duration: theme.transitions.duration.enteringScreen,
  }),
  display: "flex",
  flexDirection: "column",
  minHeight: "100vh",
}));

export default function DashboardLayout({ children, toggleDarkMode, currentMode }) {
  const theme = useTheme();
  const { data: session, status } = useSession();
  const isDark = theme.palette.mode === "dark";

  const [userRole, setUserRole] = useState(null);

  const [open, setOpen] = useState(() => {
    if (typeof window !== "undefined") {
      const storedState = localStorage.getItem("sidebarOpen");
      return storedState ? JSON.parse(storedState) : true;
    }
    return true;
  });

  useEffect(() => {
    if (session?.user?.role) {
      setUserRole(session.user.role);
    }
  }, [session]);

  if (status === "loading" || !userRole) {
    return (
      <Box sx={{ display: "flex", justifyContent: "center", alignItems: "center", minHeight: "100vh", backgroundColor: "#0B2A2D" }}>
        <Typography sx={{ color: "rgba(255,255,255,0.5)" }}>Cargando...</Typography>
      </Box>
    );
  }

  const handleDrawerToggle = () => {
    setOpen((prev) => {
      const newState = !prev;
      if (typeof window !== "undefined") {
        localStorage.setItem("sidebarOpen", JSON.stringify(newState));
      }
      return newState;
    });
  };

  // Colores alineados con la marca (teal oscuro)
  const drawerBg = isDark
    ? "linear-gradient(180deg, #0B2A2D 0%, #0D3236 100%)"
    : "linear-gradient(180deg, #0B2A2D 0%, #103B40 100%)";
  const appBarBg = isDark
    ? "rgba(11, 42, 45, 0.85)"
    : "rgba(16, 59, 64, 0.9)";

  const drawerLogoSrc = "/images/Fap rrhh-marca-blanca(chico).png";
  const appBarLogoSrc = "/images/Fap-marca-blanca(chico).png";

  const menuItems = userRole === "empleador"
    ? [
        { text: "Inicio", icon: <DashboardIcon />, href: "/" },
        { text: "Publicar Oferta", icon: <PostAddIcon />, href: "/job-create" },
        { text: "Mis Ofertas", icon: <ListAltIcon />, href: "/job-list" },
        { text: "Actualizar Perfil", icon: <PersonIcon />, href: "/profile-empleador" },
      ]
    : [
        { text: "Inicio", icon: <DashboardIcon />, href: "/" },
        { text: "Ver Ofertas de Empleo", icon: <WorkIcon />, href: "/job-list" },
        { text: "Formación", icon: <SchoolIcon />, href: "/training" },
        { text: "Actualizar Perfil", icon: <PersonIcon />, href: "/profile-empleado" },
      ];

  return (
    <Box sx={{ display: "flex", backgroundColor: isDark ? "#0A1F22" : "#0E3339" }}>
      <Drawer variant="permanent" open={open} drawerbg={drawerBg}>
        <DrawerHeader sx={{ minHeight: 72, px: 2 }}>
          {open && (
            <Link href="/" passHref>
              <Image
                src={drawerLogoSrc}
                alt="Logo de la empresa"
                width={180}
                height={80}
                priority
                style={{ objectFit: "contain" }}
              />
            </Link>
          )}
          <IconButton
            onClick={handleDrawerToggle}
            sx={{
              color: "rgba(255,255,255,0.7)",
              transition: "all 0.2s ease",
              "&:hover": { color: "#D96236", backgroundColor: "rgba(217,98,54,0.1)" },
            }}
          >
            {open ? <ChevronLeftIcon /> : <ChevronRightIcon />}
          </IconButton>
        </DrawerHeader>
        <Divider sx={{ bgcolor: "rgba(255,255,255,0.08)", mx: 1 }} />
        <List sx={{ px: 1, mt: 1 }}>
          {menuItems.map((item) => (
            <Tooltip key={item.text} title={!open ? item.text : ""} placement="right" arrow>
              <ListItem
                button
                component={Link}
                href={item.href}
                sx={{
                  borderRadius: "10px",
                  mb: 0.5,
                  py: 1.2,
                  transition: "all 0.2s ease",
                  "&:hover": {
                    backgroundColor: "rgba(217, 98, 54, 0.15)",
                    "& .MuiListItemIcon-root": { color: "#D96236" },
                  },
                }}
              >
                <ListItemIcon
                  sx={{
                    color: "rgba(255,255,255,0.7)",
                    minWidth: 0,
                    mr: open ? 2 : "auto",
                    justifyContent: "center",
                    transition: "color 0.2s ease",
                  }}
                >
                  {item.icon}
                </ListItemIcon>
                {open && (
                  <ListItemText
                    primary={item.text}
                    primaryTypographyProps={{
                      color: "rgba(255,255,255,0.85)",
                      fontSize: "0.95rem",
                      fontWeight: 500,
                    }}
                  />
                )}
              </ListItem>
            </Tooltip>
          ))}
        </List>
      </Drawer>

      <Main open={open}>
        <AppBar
          position="static"
          sx={{
            backgroundColor: appBarBg,
            backdropFilter: "blur(12px)",
            WebkitBackdropFilter: "blur(12px)",
            boxShadow: "0 1px 0 rgba(255,255,255,0.06)",
            borderBottom: "1px solid rgba(255,255,255,0.06)",
          }}
        >
          <Toolbar sx={{ minHeight: 64 }}>
            {!open && (
              <Link href="/" passHref>
                <Image
                  src={appBarLogoSrc}
                  alt="Logo AppBar"
                  width={90}
                  height={45}
                  priority
                  style={{ objectFit: "contain" }}
                />
              </Link>
            )}
            {toggleDarkMode && (
              <Tooltip title={currentMode === "dark" ? "Modo claro" : "Modo oscuro"} arrow>
                <IconButton
                  onClick={toggleDarkMode}
                  color="inherit"
                  sx={{
                    marginLeft: "auto",
                    color: "rgba(255,255,255,0.7)",
                    transition: "all 0.2s ease",
                    "&:hover": { color: "#D96236", backgroundColor: "rgba(217,98,54,0.1)" },
                  }}
                >
                  {currentMode === "dark" ? <Brightness7Icon /> : <Brightness4Icon />}
                </IconButton>
              </Tooltip>
            )}
          </Toolbar>
        </AppBar>

        <Box sx={{ p: { xs: 2, sm: 3 }, flexGrow: 1 }}>
          {children}
        </Box>

        <Footer />
      </Main>
    </Box>
  );
}
