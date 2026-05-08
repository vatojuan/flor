// pages/employer/favoritos.js
import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/router";
import Link from "next/link";
import useAuthUser from "../../hooks/useAuthUser";
import useSnackbar from "../../hooks/useSnackbar";
import DashboardLayout from "../../components/DashboardLayout";
import PageHeader from "../../components/ui/PageHeader";
import {
  Box,
  Paper,
  Typography,
  Avatar,
  Chip,
  Grid,
  Card,
  CardActionArea,
  CardContent,
  IconButton,
  Rating,
  Snackbar,
  Alert,
  CircularProgress,
  Tooltip,
} from "@mui/material";
import FavoriteIcon from "@mui/icons-material/Favorite";
import StarIcon from "@mui/icons-material/Star";
import WorkHistoryIcon from "@mui/icons-material/WorkHistory";

const API_URL =
  process.env.NEXT_PUBLIC_API_URL || "https://api.fapmendoza.online";

export default function Favoritos() {
  const { data: session, status: sessionStatus } = useSession();
  const router = useRouter();
  const { token } = useAuthUser();
  const { snackbar, showSnackbar, closeSnackbar } = useSnackbar();

  const [favorites, setFavorites] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (sessionStatus === "loading") return;
    if (!session) {
      router.replace("/login");
      return;
    }
    if (session.user?.role === "empleado") {
      router.replace("/dashboard");
    }
  }, [session, sessionStatus, router]);

  useEffect(() => {
    if (!token) return;

    const fetchFavorites = async () => {
      try {
        const res = await fetch(`${API_URL}/api/reputation/favorites`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.ok) {
          setFavorites(await res.json());
        }
      } catch {
        // silent
      } finally {
        setLoading(false);
      }
    };

    fetchFavorites();
  }, [token]);

  const removeFavorite = async (candidateId) => {
    try {
      const res = await fetch(
        `${API_URL}/api/reputation/favorites/${candidateId}`,
        {
          method: "DELETE",
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      if (res.ok) {
        setFavorites((prev) =>
          prev.filter((f) => f.candidate_id !== candidateId)
        );
        showSnackbar("Favorito eliminado", "info");
      }
    } catch {
      showSnackbar("Error al eliminar favorito", "error");
    }
  };

  if (sessionStatus === "loading" || loading) {
    return (
      <DashboardLayout userRole="empleador">
        <Box
          sx={{
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            minHeight: "40vh",
          }}
        >
          <CircularProgress sx={{ color: "#D96236" }} />
        </Box>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout userRole={session?.user?.role || "empleador"}>
      <Box sx={{ maxWidth: 900, mx: "auto", mt: 4, px: 2 }}>
        <PageHeader title="Mis Favoritos" />

        {favorites.length === 0 ? (
          <Paper sx={{ p: 4, textAlign: "center", borderRadius: 3 }}>
            <FavoriteIcon
              sx={{ fontSize: 60, color: "text.disabled", mb: 2 }}
            />
            <Typography variant="h6" color="text.secondary">
              No tienes candidatos favoritos
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
              Visita el perfil de un candidato y presiona el corazon para
              agregarlo a favoritos.
            </Typography>
          </Paper>
        ) : (
          <Grid container spacing={2}>
            {favorites.map((fav) => (
              <Grid item xs={12} sm={6} md={4} key={fav.id}>
                <Card
                  elevation={1}
                  sx={{
                    borderRadius: 3,
                    border: "1px solid",
                    borderColor: "divider",
                    transition: "all 0.25s ease",
                    "&:hover": {
                      transform: "translateY(-2px)",
                      boxShadow: 4,
                    },
                    position: "relative",
                  }}
                >
                  {/* Remove favorite button */}
                  <Tooltip title="Quitar de favoritos">
                    <IconButton
                      onClick={() => removeFavorite(fav.candidate_id)}
                      sx={{
                        position: "absolute",
                        top: 8,
                        right: 8,
                        zIndex: 1,
                        color: "#e53935",
                        "&:hover": {
                          backgroundColor: "rgba(229, 57, 53, 0.08)",
                        },
                      }}
                    >
                      <FavoriteIcon />
                    </IconButton>
                  </Tooltip>

                  <CardActionArea
                    component={Link}
                    href={`/candidato/${fav.candidate_id}`}
                  >
                    <CardContent
                      sx={{
                        display: "flex",
                        flexDirection: "column",
                        alignItems: "center",
                        py: 3,
                      }}
                    >
                      <Avatar
                        src={
                          fav.candidate_picture || "/images/default-user.png"
                        }
                        alt={fav.candidate_name}
                        sx={{ width: 80, height: 80, mb: 1.5 }}
                      />
                      <Typography
                        variant="subtitle1"
                        fontWeight={600}
                        textAlign="center"
                      >
                        {fav.candidate_name || "Candidato"}
                      </Typography>
                      {fav.candidate_rubro && (
                        <Chip
                          label={fav.candidate_rubro}
                          size="small"
                          sx={{
                            mt: 0.5,
                            backgroundColor: "#103B40",
                            color: "#fff",
                            fontWeight: 600,
                          }}
                        />
                      )}
                      {fav.review_count > 0 && (
                        <Box
                          sx={{
                            display: "flex",
                            alignItems: "center",
                            gap: 0.5,
                            mt: 1,
                          }}
                        >
                          <StarIcon
                            sx={{ color: "#FFB300", fontSize: 20 }}
                          />
                          <Typography variant="body2" fontWeight={600}>
                            {fav.avg_rating}
                          </Typography>
                          <Typography
                            variant="caption"
                            color="text.secondary"
                          >
                            ({fav.review_count})
                          </Typography>
                        </Box>
                      )}
                    </CardContent>
                  </CardActionArea>
                </Card>
              </Grid>
            ))}
          </Grid>
        )}
      </Box>

      <Snackbar
        open={snackbar.open}
        autoHideDuration={4000}
        onClose={closeSnackbar}
        anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
      >
        <Alert
          onClose={closeSnackbar}
          severity={snackbar.severity}
          variant="filled"
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </DashboardLayout>
  );
}
