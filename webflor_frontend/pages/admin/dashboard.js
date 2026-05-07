import React, { useState, useEffect } from "react";
import {
  Box,
  Card,
  CardContent,
  Typography,
  Grid,
  Button,
  CircularProgress,
  Alert,
} from "@mui/material";
import { useTheme } from "@mui/material/styles";
import PeopleIcon from "@mui/icons-material/People";
import WorkIcon from "@mui/icons-material/Work";
import CompareArrowsIcon from "@mui/icons-material/CompareArrows";
import EmailIcon from "@mui/icons-material/Email";
import NoteAddIcon from "@mui/icons-material/NoteAdd";
import LocalOfferIcon from "@mui/icons-material/LocalOffer";
import VisibilityIcon from "@mui/icons-material/Visibility";
import { useRouter } from "next/router";
import DashboardLayout from "../../components/DashboardLayout";
import useAdminAuth from "../../hooks/useAdminAuth";

const API_URL = process.env.NEXT_PUBLIC_API_URL;

function StatCard({ icon, value, label, accentColor }) {
  return (
    <Card
      elevation={1}
      sx={{
        height: "100%",
        borderRadius: 3,
        backgroundColor: "background.paper",
        border: "1px solid",
        borderColor: "divider",
        transition: "all 0.25s ease",
        "&:hover": {
          transform: "translateY(-3px)",
          boxShadow: 4,
        },
      }}
    >
      <CardContent sx={{ display: "flex", alignItems: "center", gap: 2.5, py: 3 }}>
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            width: 56,
            height: 56,
            borderRadius: "14px",
            backgroundColor: `${accentColor}18`,
            color: accentColor,
            flexShrink: 0,
            transition: "transform 0.2s ease",
          }}
        >
          {icon}
        </Box>
        <Box>
          <Typography variant="h4" sx={{ fontWeight: 700, color: "text.primary" }}>
            {value !== null ? value : <CircularProgress size={24} sx={{ color: "primary.main" }} />}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {label}
          </Typography>
        </Box>
      </CardContent>
    </Card>
  );
}

export default function AdminDashboard({ toggleDarkMode, currentMode }) {
  useAdminAuth();

  const theme = useTheme();
  const router = useRouter();

  const [stats, setStats] = useState({
    users: null,
    offers: null,
    matchings: null,
    emails: null,
  });
  const [error, setError] = useState(null);

  useEffect(() => {
    const token = localStorage.getItem("adminToken");
    if (!token) return;

    const headers = { Authorization: `Bearer ${token}` };

    const fetchStat = async (url, key) => {
      try {
        const res = await fetch(url, { headers });
        if (!res.ok) throw new Error(`${res.status}`);
        const data = await res.json();
        return { key, value: Array.isArray(data) ? data.length : 0 };
      } catch {
        return { key, value: 0 };
      }
    };

    Promise.all([
      fetchStat(`${API_URL}/admin/users`, "users"),
      fetchStat(`${API_URL}/api/job/admin/offers`, "offers"),
      fetchStat(`${API_URL}/api/match/admin`, "matchings"),
    ])
      .then((results) => {
        const next = { ...stats };
        results.forEach(({ key, value }) => {
          next[key] = value;
        });
        setStats(next);
      })
      .catch(() => setError("Error al cargar estadísticas"));
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const statCards = [
    {
      icon: <PeopleIcon sx={{ fontSize: 32 }} />,
      value: stats.users,
      label: "Usuarios",
      accentColor: "#D96236",
    },
    {
      icon: <WorkIcon sx={{ fontSize: 32 }} />,
      value: stats.offers,
      label: "Ofertas Laborales",
      accentColor: "#26A69A",
    },
    {
      icon: <CompareArrowsIcon sx={{ fontSize: 32 }} />,
      value: stats.matchings,
      label: "Matchings",
      accentColor: "#66BB6A",
    },
    {
      icon: <EmailIcon sx={{ fontSize: 32 }} />,
      value: stats.emails,
      label: "E-mails",
      accentColor: "#FFB300",
    },
  ];

  const quickActions = [
    { label: "Agregar CV", icon: <NoteAddIcon />, href: "/admin/agregar_cv" },
    { label: "Agregar Oferta", icon: <LocalOfferIcon />, href: "/admin/agregar_oferta" },
    { label: "Ver Matchings", icon: <VisibilityIcon />, href: "/admin/matchins" },
  ];

  return (
    <DashboardLayout toggleDarkMode={toggleDarkMode} currentMode={currentMode}>
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" sx={{ fontWeight: 700, color: "text.primary" }} gutterBottom>
          Dashboard Administrativo
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Resumen general de la plataforma FAP RRHH
        </Typography>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      <Grid container spacing={3} sx={{ mb: 5 }}>
        {statCards.map((card) => (
          <Grid item xs={12} sm={6} md={3} key={card.label}>
            <StatCard {...card} />
          </Grid>
        ))}
      </Grid>

      <Box>
        <Typography variant="h6" sx={{ fontWeight: 600, color: "text.primary", mb: 2 }}>
          Acciones Rápidas
        </Typography>
        <Box sx={{ display: "flex", gap: 2, flexWrap: "wrap" }}>
          {quickActions.map((action) => (
            <Button
              key={action.label}
              variant="outlined"
              startIcon={action.icon}
              onClick={() => router.push(action.href)}
              sx={{
                borderRadius: "12px",
                px: 3,
                py: 1.2,
                borderColor: "divider",
                color: "text.primary",
                fontWeight: 600,
                borderWidth: "2px",
                transition: "all 0.25s ease",
                "&:hover": {
                  borderColor: "#D96236",
                  color: "#D96236",
                  backgroundColor: "rgba(217, 98, 54, 0.08)",
                  borderWidth: "2px",
                  transform: "translateY(-1px)",
                },
              }}
            >
              {action.label}
            </Button>
          ))}
        </Box>
      </Box>
    </DashboardLayout>
  );
}
