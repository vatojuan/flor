import React, { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { useTheme, styled } from "@mui/material/styles";
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
import Footer from "./Footer"; // Importa el Footer

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
    return <p>Cargando...</p>;
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

  const drawerBg = isDark ? "#4E342E" : theme.palette.primary.main;
  const appBarBg = isDark ? "#3E2723" : theme.palette.primary.dark;

  // Definición de logotipos
  const drawerLogoSrc = isDark ? "/images/Fap rrhh-marca-naranja(chico).png" : "/images/Fap rrhh-marca-blanca(chico).png";
  const appBarLogoSrc = isDark ? "/images/Fap-marca-naranja(chico).png" : "/images/Fap-marca-blanca(chico).png";

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
    <Box sx={{ display: "flex", backgroundColor: theme.palette.background.default }}>
      <Drawer variant="permanent" open={open} drawerbg={drawerBg}>
        <DrawerHeader>
          {open && (
            <Link href="/" passHref>
              <Image
                src={drawerLogoSrc}
                alt="Logo de la empresa"
                width={200}
                height={90}
                priority
              />
            </Link>
          )}
          <IconButton onClick={handleDrawerToggle} sx={{ color: "#fff" }}>
            {open ? <ChevronLeftIcon /> : <ChevronRightIcon />}
          </IconButton>
        </DrawerHeader>
        <Divider sx={{ bgcolor: "rgba(255,255,255,0.3)" }} />
        <List>
          {menuItems.map((item) => (
            <ListItem button component={Link} href={item.href} key={item.text}>
              <ListItemIcon sx={{ color: "#fff", minWidth: 0, mr: open ? 2 : "auto", justifyContent: "center" }}>
                {item.icon}
              </ListItemIcon>
              {open && (
                <ListItemText primary={item.text} primaryTypographyProps={{ color: "#fff" }} />
              )}
            </ListItem>
          ))}
        </List>
      </Drawer>

      <Main open={open}>
        <AppBar position="static" sx={{ backgroundColor: appBarBg }}>
          <Toolbar>
            {/* Si el sidebar está cerrado, mostramos el logo en el AppBar */}
            {!open && (
              <Link href="/" passHref>
                <Image
                  src={appBarLogoSrc}
                  alt="Logo AppBar"
                  width={100}
                  height={50}
                  priority
                />
              </Link>
            )}
            {toggleDarkMode && (
              <IconButton onClick={toggleDarkMode} color="inherit" sx={{ marginLeft: "auto" }}>
                {currentMode === "dark" ? <Brightness7Icon /> : <Brightness4Icon />}
              </IconButton>
            )}
          </Toolbar>
        </AppBar>
        {/* Contenido principal */}
        <Box sx={{ p: 3, flexGrow: 1 }}>
          {children}
        </Box>
        {/* Footer integrado en el layout */}
        <Footer />
      </Main>
    </Box>
  );
}
