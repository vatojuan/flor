// pages/candidato/[id].js
import { useRouter } from "next/router";
import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import {
  Box,
  Paper,
  Typography,
  Avatar,
  Chip,
  Button,
  CircularProgress,
  Rating,
  TextField,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  IconButton,
  Divider,
  Snackbar,
  Alert,
  Tooltip,
} from "@mui/material";
import PhoneIcon from "@mui/icons-material/Phone";
import DescriptionOutlinedIcon from "@mui/icons-material/DescriptionOutlined";
import StarIcon from "@mui/icons-material/Star";
import FavoriteIcon from "@mui/icons-material/Favorite";
import FavoriteBorderIcon from "@mui/icons-material/FavoriteBorder";
import VerifiedIcon from "@mui/icons-material/Verified";
import WorkHistoryIcon from "@mui/icons-material/WorkHistory";
import RateReviewIcon from "@mui/icons-material/RateReview";
import MainLayout from "../../components/MainLayout";
import useAuthUser from "../../hooks/useAuthUser";

const API_URL =
  process.env.NEXT_PUBLIC_API_URL || "https://api.fapmendoza.online";

export default function CandidatoPublicProfile() {
  const router = useRouter();
  const { id } = router.query;
  const { data: session } = useSession();
  const { token } = useAuthUser();

  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Employer actions state
  const [isFavorite, setIsFavorite] = useState(false);
  const [favLoading, setFavLoading] = useState(false);
  const [reviewOpen, setReviewOpen] = useState(false);
  const [reviewRating, setReviewRating] = useState(0);
  const [reviewComment, setReviewComment] = useState("");
  const [reviewSubmitting, setReviewSubmitting] = useState(false);
  const [snackbar, setSnackbar] = useState({ open: false, message: "", severity: "success" });

  const isEmployer = session?.user?.role === "empleador";

  useEffect(() => {
    if (!router.isReady || !id) return;

    const fetchProfile = async () => {
      try {
        const res = await fetch(`${API_URL}/api/users/${id}/public-profile`);
        if (!res.ok) {
          setError(res.status === 404 ? "Candidato no encontrado" : "Error al cargar el perfil");
          return;
        }
        setProfile(await res.json());
      } catch {
        setError("Error al cargar el perfil");
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
  }, [router.isReady, id]);

  // Check favorite status for employers
  useEffect(() => {
    if (!isEmployer || !token || !id) return;
    fetch(`${API_URL}/api/reputation/is-favorite/${id}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => r.json())
      .then((data) => setIsFavorite(data.isFavorite))
      .catch(() => {});
  }, [isEmployer, token, id]);

  const toggleFavorite = async () => {
    if (!token) return;
    setFavLoading(true);
    try {
      if (isFavorite) {
        await fetch(`${API_URL}/api/reputation/favorites/${id}`, {
          method: "DELETE",
          headers: { Authorization: `Bearer ${token}` },
        });
        setIsFavorite(false);
        setSnackbar({ open: true, message: "Quitado de favoritos", severity: "info" });
      } else {
        await fetch(`${API_URL}/api/reputation/favorites`, {
          method: "POST",
          headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
          body: JSON.stringify({ candidate_id: parseInt(id) }),
        });
        setIsFavorite(true);
        setSnackbar({ open: true, message: "Agregado a favoritos", severity: "success" });
      }
    } catch {
      setSnackbar({ open: true, message: "Error al actualizar favorito", severity: "error" });
    } finally {
      setFavLoading(false);
    }
  };

  const submitReview = async () => {
    if (!reviewRating) return;
    setReviewSubmitting(true);
    try {
      const res = await fetch(`${API_URL}/api/reputation/reviews`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          candidate_id: parseInt(id),
          rating: reviewRating,
          comment: reviewComment || null,
        }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.detail || "Error");
      }
      setSnackbar({ open: true, message: "Resena guardada", severity: "success" });
      setReviewOpen(false);
      setReviewRating(0);
      setReviewComment("");
      // Refresh profile to show updated reviews
      const updated = await fetch(`${API_URL}/api/users/${id}/public-profile`);
      if (updated.ok) setProfile(await updated.json());
    } catch (err) {
      setSnackbar({ open: true, message: err.message || "Error al guardar resena", severity: "error" });
    } finally {
      setReviewSubmitting(false);
    }
  };

  if (loading) {
    return (
      <MainLayout>
        <Box sx={{ display: "flex", justifyContent: "center", alignItems: "center", minHeight: "60vh" }}>
          <CircularProgress sx={{ color: "#103B40" }} />
        </Box>
      </MainLayout>
    );
  }

  if (error) {
    return (
      <MainLayout>
        <Box sx={{ display: "flex", justifyContent: "center", alignItems: "center", minHeight: "60vh" }}>
          <Typography variant="h6" color="text.secondary">{error}</Typography>
        </Box>
      </MainLayout>
    );
  }

  const rep = profile.reputation || {};
  const reviews = profile.reviews || [];

  return (
    <MainLayout>
      <Box sx={{ display: "flex", justifyContent: "center", px: 2, py: { xs: 4, md: 6 }, minHeight: "60vh" }}>
        <Box sx={{ maxWidth: 650, width: "100%", display: "flex", flexDirection: "column", gap: 3 }}>
          {/* ── Profile Card ── */}
          <Paper
            elevation={3}
            sx={{
              p: { xs: 3, md: 5 },
              borderRadius: 3,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: 2,
            }}
          >
            {/* Avatar */}
            <Box sx={{ position: "relative" }}>
              <Avatar
                src={profile.profilePicture || "/images/default-user.png"}
                alt={profile.name}
                sx={{ width: 140, height: 140, mb: 1 }}
              />
              {rep.badgeVerified && (
                <Tooltip title="Candidato Verificado - 5+ resenas positivas">
                  <VerifiedIcon
                    sx={{
                      position: "absolute",
                      bottom: 8,
                      right: -4,
                      fontSize: 32,
                      color: "#1976d2",
                      backgroundColor: "#fff",
                      borderRadius: "50%",
                    }}
                  />
                </Tooltip>
              )}
            </Box>

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

            {/* Reputation Summary */}
            {rep.reviewCount > 0 && (
              <Box
                sx={{
                  display: "flex",
                  alignItems: "center",
                  gap: 2,
                  flexWrap: "wrap",
                  justifyContent: "center",
                }}
              >
                <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
                  <StarIcon sx={{ color: "#FFB300", fontSize: 28 }} />
                  <Typography variant="h6" fontWeight={700}>
                    {rep.avgRating}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    ({rep.reviewCount} {rep.reviewCount === 1 ? "resena" : "resenas"})
                  </Typography>
                </Box>
                {rep.jobsCompleted > 0 && (
                  <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
                    <WorkHistoryIcon sx={{ color: "#26A69A", fontSize: 22 }} />
                    <Typography variant="body2" color="text.secondary">
                      {rep.jobsCompleted} {rep.jobsCompleted === 1 ? "trabajo" : "trabajos"} realizados
                    </Typography>
                  </Box>
                )}
              </Box>
            )}

            {/* Employer Actions */}
            {isEmployer && (
              <Box sx={{ display: "flex", gap: 1.5, mt: 1 }}>
                <Tooltip title={isFavorite ? "Quitar de favoritos" : "Agregar a favoritos"}>
                  <IconButton
                    onClick={toggleFavorite}
                    disabled={favLoading}
                    sx={{
                      color: isFavorite ? "#e53935" : "text.secondary",
                      border: "1px solid",
                      borderColor: isFavorite ? "#e53935" : "divider",
                      "&:hover": {
                        backgroundColor: isFavorite
                          ? "rgba(229, 57, 53, 0.08)"
                          : "rgba(0,0,0,0.04)",
                      },
                    }}
                  >
                    {isFavorite ? <FavoriteIcon /> : <FavoriteBorderIcon />}
                  </IconButton>
                </Tooltip>
                <Button
                  variant="outlined"
                  startIcon={<RateReviewIcon />}
                  onClick={() => setReviewOpen(true)}
                  sx={{
                    borderColor: "#103B40",
                    color: "#103B40",
                    "&:hover": {
                      borderColor: "#0d2e32",
                      backgroundColor: "rgba(16, 59, 64, 0.06)",
                    },
                  }}
                >
                  Calificar
                </Button>
              </Box>
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

          {/* ── Reviews Section ── */}
          {reviews.length > 0 && (
            <Paper elevation={2} sx={{ p: { xs: 3, md: 4 }, borderRadius: 3 }}>
              <Typography variant="h6" fontWeight={600} sx={{ mb: 2 }}>
                Resenas de empleadores
              </Typography>
              {reviews.map((review, idx) => (
                <Box key={review.id}>
                  {idx > 0 && <Divider sx={{ my: 2 }} />}
                  <Box>
                    <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 0.5 }}>
                      <Rating value={review.rating} readOnly size="small" />
                      <Typography variant="body2" fontWeight={600}>
                        {review.employer_name || "Empleador"}
                      </Typography>
                    </Box>
                    {review.job_title && (
                      <Typography variant="caption" color="text.secondary">
                        Trabajo: {review.job_title}
                      </Typography>
                    )}
                    {review.comment && (
                      <Typography variant="body2" sx={{ mt: 0.5 }}>
                        &ldquo;{review.comment}&rdquo;
                      </Typography>
                    )}
                    {review.created_at && (
                      <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: "block" }}>
                        {new Date(review.created_at).toLocaleDateString("es-AR")}
                      </Typography>
                    )}
                  </Box>
                </Box>
              ))}
            </Paper>
          )}
        </Box>
      </Box>

      {/* ── Review Dialog ── */}
      <Dialog open={reviewOpen} onClose={() => setReviewOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Calificar a {profile.name}</DialogTitle>
        <DialogContent>
          <Box sx={{ display: "flex", flexDirection: "column", gap: 2, mt: 1 }}>
            <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
              <Typography>Calificacion:</Typography>
              <Rating
                value={reviewRating}
                onChange={(_, val) => setReviewRating(val)}
                size="large"
              />
            </Box>
            <TextField
              label="Comentario (opcional)"
              multiline
              rows={3}
              value={reviewComment}
              onChange={(e) => setReviewComment(e.target.value)}
              fullWidth
              placeholder="Ej: Excelente trabajador, puntual y responsable"
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setReviewOpen(false)}>Cancelar</Button>
          <Button
            onClick={submitReview}
            variant="contained"
            disabled={!reviewRating || reviewSubmitting}
            sx={{ backgroundColor: "#103B40", "&:hover": { backgroundColor: "#0d2e32" } }}
          >
            {reviewSubmitting ? "Guardando..." : "Guardar Resena"}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Snackbar */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={4000}
        onClose={() => setSnackbar((s) => ({ ...s, open: false }))}
        anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
      >
        <Alert
          onClose={() => setSnackbar((s) => ({ ...s, open: false }))}
          severity={snackbar.severity}
          variant="filled"
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </MainLayout>
  );
}
