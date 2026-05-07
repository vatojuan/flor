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
  const theme = useTheme();
  return (
    <Card
      elevation={2}
      sx={{
        height: "100%",
        borderTop: `4px solid ${accentColor}`,
        transition: "box-shadow 0.2s",
        "&:hover": { boxShadow: theme.shadows[6] },
      }}
    >
      <CardContent sx={{ display: "flex", alignItems: "center", gap: 2, py: 3 }}>
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            width: 56,
            height: 56,
            borderRadius: 2,
            backgroundColor: `${accentColor}18`,
            color: accentColor,
            flexShrink: 0,
          }}
        >
          {icon}
        </Box>
        <Box>
          <Typography variant="h4" fontWeight={700}>
            {value !== null ? value : <CircularProgress size={24} />}
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
      accentColor: theme.palette.primary.main,
    },
    {
      icon: <WorkIcon sx={{ fontSize: 32 }} />,
      value: stats.offers,
      label: "Ofertas Laborales",
      accentColor: theme.palette.secondary.main,
    },
    {
      icon: <CompareArrowsIcon sx={{ fontSize: 32 }} />,
      value: stats.matchings,
      label: "Matchings",
      accentColor: theme.palette.success?.main || "#2e7d32",
    },
    {
      icon: <EmailIcon sx={{ fontSize: 32 }} />,
      value: stats.emails,
      label: "E-mails",
      accentColor: theme.palette.warning?.main || "#ed6c02",
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
        <Typography variant="h4" fontWeight={700} gutterBottom>
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

      <Grid container spacing={3} sx={{ mb: 4 }}>
        {statCards.map((card) => (
          <Grid item xs={12} sm={6} md={3} key={card.label}>
            <StatCard {...card} />
          </Grid>
        ))}
      </Grid>

      <Box>
        <Typography variant="h6" fontWeight={600} gutterBottom>
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
                textTransform: "none",
                borderRadius: 2,
                px: 3,
                py: 1.2,
                borderColor: theme.palette.divider,
                color: theme.palette.text.primary,
                "&:hover": {
                  borderColor: theme.palette.primary.main,
                  backgroundColor: `${theme.palette.primary.main}0A`,
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
