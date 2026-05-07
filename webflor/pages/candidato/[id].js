// pages/candidato/[id].js
import { useRouter } from "next/router";
import { useEffect, useState } from "react";
import {
  Box,
  Paper,
  Typography,
  Avatar,
  Chip,
  Button,
  CircularProgress,
} from "@mui/material";
import PhoneIcon from "@mui/icons-material/Phone";
import DescriptionOutlinedIcon from "@mui/icons-material/DescriptionOutlined";
import MainLayout from "../../components/MainLayout";

const API_URL =
  process.env.NEXT_PUBLIC_API_URL || "https://api.fapmendoza.online";

export default function CandidatoPublicProfile() {
  const router = useRouter();
  const { id } = router.query;

  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!router.isReady || !id) return;

    const fetchProfile = async () => {
      try {
        const res = await fetch(
          `${API_URL}/api/users/${id}/public-profile`
        );
        if (!res.ok) {
          if (res.status === 404) {
            setError("Candidato no encontrado");
          } else {
            setError("Error al cargar el perfil");
          }
          return;
        }
        const data = await res.json();
        setProfile(data);
      } catch (err) {
        console.error("Error fetching public profile:", err);
        setError("Error al cargar el perfil");
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
  }, [router.isReady, id]);

  if (loading) {
    return (
      <MainLayout>
        <Box
          sx={{
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            minHeight: "60vh",
          }}
        >
          <CircularProgress sx={{ color: "#103B40" }} />
        </Box>
      </MainLayout>
    );
  }

  if (error) {
    return (
      <MainLayout>
        <Box
          sx={{
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            minHeight: "60vh",
          }}
        >
          <Typography variant="h6" color="text.secondary">
            {error}
          </Typography>
        </Box>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <Box
        sx={{
          display: "flex",
          justifyContent: "center",
          px: 2,
          py: { xs: 4, md: 6 },
          minHeight: "60vh",
        }}
      >
        <Paper
          elevation={3}
          sx={{
            maxWidth: 600,
            width: "100%",
            p: { xs: 3, md: 5 },
            borderRadius: 3,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: 2,
          }}
        >
          {/* Avatar */}
          <Avatar
            src={profile.profilePicture || "/images/default-user.png"}
            alt={profile.name}
            sx={{ width: 140, height: 140, mb: 1 }}
          />

          {/* Name */}
          <Typography variant="h4" fontWeight={700} textAlign="center">
            {profile.name}
          </Typography>

          {/* Rubro Chip */}
          {profile.rubro && (
            <Chip
              label={profile.rubro}
              sx={{
                backgroundColor: "#103B40",
                color: "#fff",
                fontWeight: 600,
                fontSize: "0.95rem",
              }}
            />
          )}

          {/* Description */}
          {profile.description && (
            <Typography
              variant="body1"
              color="text.secondary"
              textAlign="center"
              sx={{ mt: 1, whiteSpace: "pre-line" }}
            >
              {profile.description}
            </Typography>
          )}

          {/* Phone */}
          {profile.phone && (
            <Box sx={{ display: "flex", alignItems: "center", gap: 1, mt: 1 }}>
              <PhoneIcon fontSize="small" color="action" />
              <Typography variant="body1">{profile.phone}</Typography>
            </Box>
          )}

          {/* CV Button */}
          {profile.cvUrl && (
            <Button
              variant="outlined"
              startIcon={<DescriptionOutlinedIcon />}
              href={profile.cvUrl}
              target="_blank"
              rel="noopener noreferrer"
              sx={{
                mt: 2,
                borderColor: "#103B40",
                color: "#103B40",
                "&:hover": {
                  borderColor: "#0d2e32",
                  backgroundColor: "rgba(16, 59, 64, 0.06)",
                },
              }}
            >
              Ver CV
            </Button>
          )}
        </Paper>
      </Box>
    </MainLayout>
  );
}
