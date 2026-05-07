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
  Tooltip,
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
import SupportAgentIcon from "@mui/icons-material/SupportAgent";
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
  minHeight: 72,
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
    background: drawerbg,
    color: "#fff",
    borderRight: "1px solid rgba(255,255,255,0.06)",
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
  const isDark = theme.palette.mode === "dark";

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

  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 60000);
    return () => clearInterval(interval);
  }, [fetchNotifications]);

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

  // Colores alineados con la marca (teal oscuro)
  const drawerBg = isDark
    ? "linear-gradient(180deg, #0B2A2D 0%, #0D3236 100%)"
    : "linear-gradient(180deg, #0B2A2D 0%, #103B40 100%)";
  const appBarBg = isDark
    ? "rgba(11, 42, 45, 0.85)"
    : "rgba(16, 59, 64, 0.9)";

  const menuItems = [
    { text: "Dashboard", icon: <DashboardIcon />, href: "/admin/dashboard" },
    { text: "Formación", icon: <SchoolIcon />, href: "/admin/gestion-cursos" },
    { text: "Editar BD", icon: <EditIcon />, href: "/admin/editar_db" },
    { text: "Agregar CV", icon: <NoteAddIcon />, href: "/admin/agregar_cv" },
    { text: "Agregar oferta", icon: <LocalOfferIcon />, href: "/admin/agregar_oferta" },
    { text: "Mis ofertas", icon: <ListAltIcon />, href: "/admin/mis_ofertas" },
    { text: "Matchins", icon: <CompareArrowsIcon />, href: "/admin/matchins" },
    { text: "Propuestas", icon: <AssignmentIcon />, href: "/admin/propuestas" },
    { text: "Plantillas", icon: <WidgetsIcon />, href: "/admin/templates" },
    { text: "Bandejas", icon: <InboxIcon />, href: "/admin/inbox" },
    { text: "Mailing", icon: <SendIcon />, href: "/admin/mailing" },
    { text: "Screenshot", icon: <CameraAltIcon />, href: "/admin/screenshot_oferta" },
    { text: "Solicitudes", icon: <RequestQuoteIcon />, href: "/admin/solicitudes" },
    { text: "FAPY", icon: <SupportAgentIcon />, href: "/admin/agente" },
    { text: "Configuraciones", icon: <SettingsIcon />, href: "/admin/configuraciones" },
  ];

  return (
    <Box sx={{ display: "flex", backgroundColor: "background.default" }}>
      <Drawer variant="permanent" open={open} drawerbg={drawerBg}>
        <DrawerHeader sx={{ px: 2 }}>
          {open && (
            <Link href="/" passHref>
              <Image
                src="/images/Fap rrhh-marca-blanca(chico).png"
                alt="Logo"
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
        <List sx={{ px: 1, mt: 1, overflowY: "auto" }}>
          {menuItems.map((item, index) => {
            const isActive = router.pathname === item.href;
            const isLastMain = index === menuItems.length - 2;
            return (
              <React.Fragment key={item.text}>
                <Tooltip title={!open ? item.text : ""} placement="right" arrow>
                  <ListItem
                    button
                    component={Link}
                    href={item.href}
                    selected={isActive}
                    sx={{
                      borderRadius: "10px",
                      mb: 0.3,
                      py: 0.9,
                      pl: open ? 2 : 1.5,
                      borderLeft: isActive
                        ? "3px solid #D96236"
                        : "3px solid transparent",
                      backgroundColor: isActive
                        ? "rgba(217, 98, 54, 0.15)"
                        : "transparent",
                      "&.Mui-selected": {
                        backgroundColor: "rgba(217, 98, 54, 0.15)",
                      },
                      "&:hover": {
                        backgroundColor: "rgba(217, 98, 54, 0.1)",
                        "& .MuiListItemIcon-root": { color: "#D96236" },
                      },
                      transition: "all 0.2s ease",
                    }}
                  >
                    <ListItemIcon
                      sx={{
                        color: isActive ? "#D96236" : "rgba(255,255,255,0.6)",
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
                          color: isActive ? "#FFF" : "rgba(255,255,255,0.8)",
                          fontWeight: isActive ? 600 : 400,
                          fontSize: "0.9rem",
                        }}
                      />
                    )}
                  </ListItem>
                </Tooltip>
                {isLastMain && (
                  <Divider sx={{ my: 1, bgcolor: "rgba(255,255,255,0.08)", mx: 1 }} />
                )}
              </React.Fragment>
            );
          })}
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
                  src="/images/Fap-marca-blanca(chico).png"
                  alt="Logo AppBar"
                  width={90}
                  height={45}
                  priority
                  style={{ objectFit: "contain" }}
                />
              </Link>
            )}
            <Box sx={{ flexGrow: 1 }} />

            {/* Logout */}
            <Tooltip title="Cerrar sesión" arrow>
              <IconButton
                onClick={() => { localStorage.removeItem("adminToken"); router.push("/admin/login"); }}
                sx={{
                  color: "rgba(255,255,255,0.6)",
                  mr: 1,
                  transition: "all 0.2s ease",
                  "&:hover": { color: "#ef5350", backgroundColor: "rgba(239,83,80,0.08)" },
                }}
              >
                <LogoutIcon />
              </IconButton>
            </Tooltip>

            {/* Notifications */}
            <Tooltip title="Notificaciones" arrow>
              <IconButton
                onClick={handleNotifOpen}
                sx={{
                  color: "rgba(255,255,255,0.7)",
                  mr: 1,
                  transition: "all 0.2s ease",
                  "&:hover": { color: "#D96236", backgroundColor: "rgba(217,98,54,0.1)" },
                }}
              >
                <Badge
                  badgeContent={unreadCount}
                  color="error"
                  max={99}
                  sx={{
                    "& .MuiBadge-badge": {
                      boxShadow: "0 2px 8px rgba(239,83,80,0.4)",
                    },
                  }}
                >
                  <NotificationsIcon />
                </Badge>
              </IconButton>
            </Tooltip>

            <Popover
              open={Boolean(notifAnchor)}
              anchorEl={notifAnchor}
              onClose={handleNotifClose}
              anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
              transformOrigin={{ vertical: "top", horizontal: "right" }}
              PaperProps={{
                sx: {
                  width: 380,
                  maxHeight: 480,
                  mt: 1,
                  borderRadius: "12px",
                  backgroundColor: isDark ? "rgba(11,42,45,0.97)" : "rgba(16,59,64,0.97)",
                  backdropFilter: "blur(16px)",
                  border: "1px solid rgba(255,255,255,0.1)",
                  boxShadow: "0 8px 32px rgba(0,0,0,0.3)",
                  color: "#FFF",
                },
              }}
            >
              <Box sx={{ p: 2, display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid rgba(255,255,255,0.1)" }}>
                <Typography variant="subtitle1" fontWeight={600}>Notificaciones</Typography>
                {unreadCount > 0 && (
                  <Typography
                    variant="caption"
                    sx={{ cursor: "pointer", color: "#D96236", "&:hover": { textDecoration: "underline" } }}
                    onClick={markAllRead}
                  >
                    Marcar todo leído
                  </Typography>
                )}
              </Box>
              {notifLoading ? (
                <Box sx={{ display: "flex", justifyContent: "center", p: 3 }}>
                  <CircularProgress size={28} sx={{ color: "#D96236" }} />
                </Box>
              ) : notifications.length === 0 ? (
                <Box sx={{ p: 3, textAlign: "center" }}>
                  <Typography variant="body2" sx={{ color: "rgba(255,255,255,0.5)" }}>Sin notificaciones</Typography>
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
                          backgroundColor: isRead ? "transparent" : "rgba(217,98,54,0.08)",
                          "&:hover": { backgroundColor: "rgba(217,98,54,0.12)" },
                          py: 1.2,
                          borderBottom: "1px solid rgba(255,255,255,0.06)",
                        }}
                      >
                        <ListItemIcon sx={{ minWidth: 36 }}>
                          {isRead ? <CheckCircleIcon fontSize="small" sx={{ color: "rgba(255,255,255,0.3)" }} /> : getNotifIcon(n.type)}
                        </ListItemIcon>
                        <ListItemText
                          primary={n.message}
                          secondary={timeAgo(n.date)}
                          primaryTypographyProps={{
                            variant: "body2",
                            fontWeight: isRead ? 400 : 600,
                            sx: { whiteSpace: "normal", lineHeight: 1.3, color: "#FFF" },
                          }}
                          secondaryTypographyProps={{ variant: "caption", sx: { color: "rgba(255,255,255,0.4)" } }}
                        />
                      </ListItem>
                    );
                  })}
                </List>
              )}
            </Popover>

            {/* Dark mode toggle */}
            <Tooltip title={isDark ? "Modo claro" : "Modo oscuro"} arrow>
              <IconButton
                onClick={toggleDarkMode ? toggleDarkMode : () => {}}
                sx={{
                  color: "rgba(255,255,255,0.7)",
                  transition: "all 0.2s ease",
                  "&:hover": { color: "#D96236", backgroundColor: "rgba(217,98,54,0.1)" },
                }}
              >
                {isDark ? <Brightness7Icon /> : <Brightness4Icon />}
              </IconButton>
            </Tooltip>
          </Toolbar>
        </AppBar>
        <Box sx={{ p: { xs: 2, sm: 3 }, flexGrow: 1 }}>{children}</Box>
      </Main>
    </Box>
  );
}
