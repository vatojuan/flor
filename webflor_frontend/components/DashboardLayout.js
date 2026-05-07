import React, { useState, useEffect, useCallback } from "react";
import { useTheme, styled } from "@mui/material/styles";
import {
  AppBar,
  Toolbar,
  Box,
  Badge,
  Divider,
  IconButton,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Popover,
  Typography,
  CircularProgress,
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
import PersonAddIcon from "@mui/icons-material/PersonAdd";
import WorkIcon from "@mui/icons-material/Work";
import StarIcon from "@mui/icons-material/Star";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import Brightness4Icon from "@mui/icons-material/Brightness4";
import Brightness7Icon from "@mui/icons-material/Brightness7";
import ChevronLeftIcon from "@mui/icons-material/ChevronLeft";
import ChevronRightIcon from "@mui/icons-material/ChevronRight";
import EmailIcon from "@mui/icons-material/Email";
import SchoolIcon from "@mui/icons-material/School";
import SmartToyIcon from "@mui/icons-material/SmartToy";
import SendIcon from "@mui/icons-material/Send";
import CameraAltIcon from "@mui/icons-material/CameraAlt";
import RequestQuoteIcon from "@mui/icons-material/RequestQuote";
import InboxIcon from "@mui/icons-material/Inbox";
import LogoutIcon from "@mui/icons-material/Logout";
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

  // ── Notifications state ──
  const API_URL = process.env.NEXT_PUBLIC_API_URL || "https://api.fapmendoza.online";
  const [notifications, setNotifications] = useState([]);
  const [notifLoading, setNotifLoading] = useState(false);
  const [notifAnchor, setNotifAnchor] = useState(null);
  const [readIds, setReadIds] = useState(() => {
    if (typeof window !== "undefined") {
      try {
        return JSON.parse(localStorage.getItem("notif_read_ids") || "[]");
      } catch { return []; }
    }
    return [];
  });

  const fetchNotifications = useCallback(async () => {
    try {
      const token = typeof window !== "undefined" ? localStorage.getItem("admin_token") : null;
      if (!token) return;
      setNotifLoading(true);
      const res = await fetch(`${API_URL}/api/notifications`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setNotifications(data);
      }
    } catch (err) {
      console.error("Error fetching notifications:", err);
    } finally {
      setNotifLoading(false);
    }
  }, [API_URL]);

  // Fetch on mount and every 60s
  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 60000);
    return () => clearInterval(interval);
  }, [fetchNotifications]);

  // Persist read IDs
  useEffect(() => {
    if (typeof window !== "undefined") {
      localStorage.setItem("notif_read_ids", JSON.stringify(readIds));
    }
  }, [readIds]);

  const unreadCount = notifications.filter((n) => !readIds.includes(n.id)).length;

  const handleNotifOpen = (e) => {
    setNotifAnchor(e.currentTarget);
    if (notifications.length === 0) fetchNotifications();
  };
  const handleNotifClose = () => setNotifAnchor(null);

  const markAsRead = (id) => {
    setReadIds((prev) => (prev.includes(id) ? prev : [...prev, id]));
    // Fire-and-forget PATCH (for future server-side tracking)
    const token = typeof window !== "undefined" ? localStorage.getItem("admin_token") : null;
    if (token) {
      fetch(`${API_URL}/api/notifications/${id}/read`, {
        method: "PATCH",
        headers: { Authorization: `Bearer ${token}` },
      }).catch(() => {});
    }
  };

  const markAllRead = () => {
    setReadIds(notifications.map((n) => n.id));
  };

  const getNotifIcon = (type) => {
    switch (type) {
      case "service_request": return <WorkIcon fontSize="small" color="warning" />;
      case "new_candidate": return <PersonAddIcon fontSize="small" color="info" />;
      case "high_match": return <StarIcon fontSize="small" color="success" />;
      default: return <NotificationsIcon fontSize="small" />;
    }
  };

  const timeAgo = (dateStr) => {
    if (!dateStr) return "";
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return "ahora";
    if (mins < 60) return `hace ${mins}m`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `hace ${hrs}h`;
    const days = Math.floor(hrs / 24);
    return `hace ${days}d`;
  };

  const drawerBg = theme.palette.mode === "dark" ? (theme.palette.secondary.dark || "#1a2e30") : theme.palette.primary.main;
  const appBarBg = theme.palette.mode === "dark" ? theme.palette.background.paper : theme.palette.primary.dark;

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
    { text: "Bandejas", icon: <InboxIcon />, href: "/admin/inbox" },
    { text: "Mailing", icon: <SendIcon />, href: "/admin/mailing" },
    { text: "Screenshot", icon: <CameraAltIcon />, href: "/admin/screenshot_oferta" },
    { text: "Solicitudes", icon: <RequestQuoteIcon />, href: "/admin/solicitudes" },
    { text: "Asistente FAP", icon: <SmartToyIcon />, href: "/admin/agente" },
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
                    theme.palette.mode === "dark"
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
          {menuItems.map((item, index) => {
            const isActive = router.pathname === item.href;
            const isLastMain = index === menuItems.length - 2; // divider before last item (Configuraciones)
            return (
              <React.Fragment key={item.text}>
                <Link href={item.href} passHref>
                  <a style={{ textDecoration: "none", color: "inherit" }}>
                    <ListItem
                      button
                      selected={isActive}
                      sx={{
                        borderLeft: isActive ? `3px solid ${theme.palette.warning?.main || '#e87200'}` : "3px solid transparent",
                        backgroundColor: isActive ? "rgba(255,255,255,0.12)" : "transparent",
                        "&.Mui-selected": {
                          backgroundColor: "rgba(255,255,255,0.12)",
                        },
                        "&:hover": {
                          backgroundColor: "rgba(255,255,255,0.08)",
                        },
                      }}
                    >
                      <ListItemIcon
                        sx={{
                          color: isActive ? (theme.palette.warning?.main || '#e87200') : "#fff",
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
                          primaryTypographyProps={{
                            color: "#fff",
                            fontWeight: isActive ? 600 : 400,
                            sx: { textDecoration: "none" },
                          }}
                        />
                      )}
                    </ListItem>
                  </a>
                </Link>
                {isLastMain && (
                  <Divider sx={{ my: 1, bgcolor: "rgba(255,255,255,0.15)" }} />
                )}
              </React.Fragment>
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
            <IconButton
              onClick={() => { localStorage.removeItem("adminToken"); router.push("/admin/login"); }}
              sx={{ color: "#fff", mr: 1 }}
              title="Cerrar sesion"
            >
              <LogoutIcon />
            </IconButton>
            <IconButton onClick={handleNotifOpen} sx={{ color: "#fff", mr: 2 }}>
              <Badge badgeContent={unreadCount} color="error" max={99}>
                <NotificationsIcon />
              </Badge>
            </IconButton>
            <Popover
              open={Boolean(notifAnchor)}
              anchorEl={notifAnchor}
              onClose={handleNotifClose}
              anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
              transformOrigin={{ vertical: "top", horizontal: "right" }}
              PaperProps={{ sx: { width: 380, maxHeight: 480 } }}
            >
              <Box sx={{ p: 2, display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: 1, borderColor: "divider" }}>
                <Typography variant="subtitle1" fontWeight={600}>Notificaciones</Typography>
                {unreadCount > 0 && (
                  <Typography
                    variant="caption"
                    sx={{ cursor: "pointer", color: "primary.main", "&:hover": { textDecoration: "underline" } }}
                    onClick={markAllRead}
                  >
                    Marcar todo leido
                  </Typography>
                )}
              </Box>
              {notifLoading ? (
                <Box sx={{ display: "flex", justifyContent: "center", p: 3 }}>
                  <CircularProgress size={28} />
                </Box>
              ) : notifications.length === 0 ? (
                <Box sx={{ p: 3, textAlign: "center" }}>
                  <Typography variant="body2" color="text.secondary">Sin notificaciones</Typography>
                </Box>
              ) : (
                <List dense sx={{ p: 0 }}>
                  {notifications.slice(0, 10).map((n) => {
                    const isRead = readIds.includes(n.id);
                    return (
                      <ListItem
                        key={n.id}
                        button
                        onClick={() => markAsRead(n.id)}
                        sx={{
                          backgroundColor: isRead ? "transparent" : "action.hover",
                          "&:hover": { backgroundColor: "action.selected" },
                          py: 1.2,
                          borderBottom: "1px solid",
                          borderColor: "divider",
                        }}
                      >
                        <ListItemIcon sx={{ minWidth: 36 }}>
                          {isRead ? <CheckCircleIcon fontSize="small" color="disabled" /> : getNotifIcon(n.type)}
                        </ListItemIcon>
                        <ListItemText
                          primary={n.message}
                          secondary={timeAgo(n.date)}
                          primaryTypographyProps={{
                            variant: "body2",
                            fontWeight: isRead ? 400 : 600,
                            sx: { whiteSpace: "normal", lineHeight: 1.3 },
                          }}
                          secondaryTypographyProps={{ variant: "caption" }}
                        />
                      </ListItem>
                    );
                  })}
                </List>
              )}
            </Popover>
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
