import React, { useState, useEffect } from "react";
import { useTheme, styled } from "@mui/material/styles";
import {
  AppBar,
  Toolbar,
  Box,
  Divider,
  IconButton,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
} from "@mui/material";
import DashboardIcon from "@mui/icons-material/Dashboard";
import EditIcon from "@mui/icons-material/Edit";
import NoteAddIcon from "@mui/icons-material/NoteAdd";
import LocalOfferIcon from "@mui/icons-material/LocalOffer";
import ListAltIcon from "@mui/icons-material/ListAlt";
import CompareArrowsIcon from "@mui/icons-material/CompareArrows";
import AssignmentIcon from "@mui/icons-material/Assignment";
import WidgetsIcon from "@mui/icons-material/Widgets";
import SettingsIcon from "@mui/icons-material/Settings";
import NotificationsIcon from "@mui/icons-material/Notifications";
import Brightness4Icon from "@mui/icons-material/Brightness4";
import Brightness7Icon from "@mui/icons-material/Brightness7";
import ChevronLeftIcon from "@mui/icons-material/ChevronLeft";
import ChevronRightIcon from "@mui/icons-material/ChevronRight";
import EmailIcon from "@mui/icons-material/Email";
import SchoolIcon from '@mui/icons-material/School'; // <-- 1. IMPORTA EL NUEVO ÍCONO
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/router";
import MuiDrawer from "@mui/material/Drawer";

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

const Main = styled("main", { shouldForwardProp: (prop) => prop !== "open" })(
  ({ theme, open }) => ({
    flexGrow: 1,
    marginLeft: open ? drawerWidth : collapsedWidth,
    transition: theme.transitions.create(["margin", "width"], {
      easing: theme.transitions.easing.sharp,
      duration: theme.transitions.duration.enteringScreen,
    }),
    display: "flex",
    flexDirection: "column",
    minHeight: "100vh",
  })
);

export default function DashboardLayout({ children, toggleDarkMode, currentMode }) {
  const theme = useTheme();
  const router = useRouter();

  const [open, setOpen] = useState(() => {
    if (typeof window !== "undefined") {
      const stored = localStorage.getItem("sidebarOpen");
      return stored !== null ? JSON.parse(stored) : true;
    }
    return true;
  });

  useEffect(() => {
    if (typeof window !== "undefined") {
      localStorage.setItem("sidebarOpen", JSON.stringify(open));
    }
  }, [open]);

  const handleDrawerToggle = () => setOpen((prev) => !prev);

  const drawerBg = theme.palette.mode === "dark" ? "#4E342E" : theme.palette.primary.main;
  const appBarBg = theme.palette.mode === "dark" ? "#3E2723" : theme.palette.primary.dark;

  const menuItems = [
    { text: "Dashboard", icon: <DashboardIcon />, href: "/admin/dashboard" },
    { text: "Formación", icon: <SchoolIcon />, href: "/admin/gestion-cursos" }, // <-- 2. AÑADE LA NUEVA LÍNEA AQUÍ
    { text: "Editar BD", icon: <EditIcon />, href: "/admin/editar_db" },
    { text: "Agregar CV", icon: <NoteAddIcon />, href: "/admin/agregar_cv" },
    { text: "Agregar oferta", icon: <LocalOfferIcon />, href: "/admin/agregar_oferta" },
    { text: "Mis ofertas", icon: <ListAltIcon />, href: "/admin/mis_ofertas" },
    { text: "Matchins", icon: <CompareArrowsIcon />, href: "/admin/matchins" },
    { text: "Propuestas", icon: <AssignmentIcon />, href: "/admin/propuestas" },
    { text: "Plantillas", icon: <WidgetsIcon />, href: "/admin/templates" },
    { text: "BD e-mails", icon: <EmailIcon />, href: "/admin/bd_emails" },
    { text: "Configuraciones", icon: <SettingsIcon />, href: "/admin/configuraciones" },
  ];

  return (
    <Box sx={{ display: "flex", backgroundColor: theme.palette.background.default }}>
      <Drawer variant="permanent" open={open} drawerbg={drawerBg}>
        <DrawerHeader>
          {open && (
            <Link href="/" passHref>
              <a style={{ textDecoration: "none" }}>
                <Image
                  src={
                    drawerBg === "#4E342E"
                      ? "/images/Fap rrhh-marca-naranja(chico).png"
                      : "/images/Fap rrhh-marca-blanca(chico).png"
                  }
                  alt="Logo"
                  width={200}
                  height={90}
                  priority
                />
              </a>
            </Link>
          )}
          <IconButton onClick={handleDrawerToggle} sx={{ color: "#fff" }}>
            {open ? <ChevronLeftIcon /> : <ChevronRightIcon />}
          </IconButton>
        </DrawerHeader>
        <Divider sx={{ bgcolor: "rgba(255,255,255,0.3)" }} />
        <List>
          {menuItems.map((item) => {
            const isActive = router.pathname === item.href;
            return (
              <Link href={item.href} key={item.text} passHref>
                <a style={{ textDecoration: "none", color: "inherit" }}>
                  <ListItem
                    button
                    selected={isActive}
                    sx={{
                      "&.Mui-selected": { backgroundColor: theme.palette.action.selected },
                    }}
                  >
                    <ListItemIcon
                      sx={{
                        color: "#fff",
                        minWidth: 0,
                        mr: open ? 2 : "auto",
                        justifyContent: "center",
                      }}
                    >
                      {item.icon}
                    </ListItemIcon>
                    {open && (
                      <ListItemText
                        primary={item.text}
                        primaryTypographyProps={{ color: "#fff", sx: { textDecoration: "none" } }}
                      />
                    )}
                  </ListItem>
                </a>
              </Link>
            );
          })}
        </List>
      </Drawer>

      <Main open={open}>
        <AppBar position="static" sx={{ backgroundColor: appBarBg }}>
          <Toolbar>
            {!open && (
              <Link href="/" passHref>
                <a style={{ textDecoration: "none" }}>
                  <Image
                    src={
                      theme.palette.mode === "dark"
                        ? "/images/Fap-marca-naranja(chico).png"
                        : "/images/Fap-marca-blanca(chico).png"
                    }
                    alt="Logo AppBar"
                    width={100}
                    height={50}
                    priority
                  />
                </a>
              </Link>
            )}
            <Box sx={{ flexGrow: 1 }} />
            <IconButton sx={{ color: "#fff", mr: 2 }}>
              <NotificationsIcon />
            </IconButton>
            <IconButton onClick={toggleDarkMode ? toggleDarkMode : () => {}} sx={{ color: "#fff" }}>
              {theme.palette.mode === "dark" ? <Brightness7Icon /> : <Brightness4Icon />}
            </IconButton>
          </Toolbar>
        </AppBar>
        <Box sx={{ p: 3, flexGrow: 1 }}>{children}</Box>
      </Main>

      <style jsx global>{`
        a {
          text-decoration: none !important;
          color: inherit !important;
        }
      `}</style>
    </Box>
  );
}
