// components/ui/JobCard.js
import {
  Card,
  CardContent,
  CardActions,
  Typography,
  Chip,
  Stack,
  useTheme,
  alpha,
} from "@mui/material";
import PersonIcon from "@mui/icons-material/Person";
import CalendarTodayIcon from "@mui/icons-material/CalendarToday";
import ScheduleIcon from "@mui/icons-material/Schedule";
import StarIcon from "@mui/icons-material/Star";

/**
 * Reusable job card component.
 *
 * Props:
 * - job: { id, title, createdAt, expirationDate, candidatesCount, label, rubro, is_paid }
 * - actions: ReactNode rendered in CardActions
 * - highlighted: boolean uses primary-tinted background
 */
export default function JobCard({ job, actions, highlighted = false }) {
  const isFeatured = job.is_paid || job.isPaid;
  const theme = useTheme();

  const publishedAt = job.createdAt || job.created_at || job.jobPostedAt || null;

  return (
    <Card
      sx={{
        display: "flex",
        flexDirection: "column",
        height: "100%",
        bgcolor: isFeatured
          ? alpha(theme.palette.primary.main, 0.08)
          : highlighted
            ? alpha(theme.palette.primary.main, 0.05)
            : "background.paper",
        border: isFeatured ? `2px solid ${alpha(theme.palette.primary.main, 0.4)}` : undefined,
        transition: "box-shadow 0.2s, transform 0.2s",
        "&:hover": {
          boxShadow: theme.shadows[4],
          transform: "translateY(-2px)",
        },
      }}
    >
      <CardContent sx={{ flexGrow: 1 }}>
        {isFeatured && (
          <Chip
            icon={<StarIcon />}
            label="Destacada"
            size="small"
            sx={{ mb: 1, bgcolor: "#FFB300", color: "#fff", fontWeight: 600 }}
          />
        )}

        <Typography variant="h6" gutterBottom>
          {job.title}
        </Typography>

        {job.rubro && (
          <Chip
            label={job.rubro}
            size="small"
            color="primary"
            variant="outlined"
            sx={{ mb: 1 }}
          />
        )}

        <Stack spacing={0.5} sx={{ mt: 1 }}>
          {publishedAt && (
            <Typography
              variant="body2"
              color="text.secondary"
              sx={{ display: "flex", alignItems: "center", gap: 0.5 }}
            >
              <CalendarTodayIcon fontSize="small" />
              Publicado:{" "}
              {new Date(publishedAt).toLocaleDateString("es-AR")}
            </Typography>
          )}

          <Typography
            variant="body2"
            color={job.expirationDate ? "error" : "text.secondary"}
            sx={{ display: "flex", alignItems: "center", gap: 0.5 }}
          >
            <ScheduleIcon fontSize="small" />
            Expira:{" "}
            {job.expirationDate
              ? new Date(job.expirationDate).toLocaleDateString("es-AR")
              : "Sin expiracion"}
          </Typography>

          <Typography
            variant="body2"
            color="text.secondary"
            sx={{ display: "flex", alignItems: "center", gap: 0.5 }}
          >
            <PersonIcon fontSize="small" />
            Candidatos: {job.candidatesCount ?? 0}
          </Typography>
        </Stack>
      </CardContent>

      {actions && (
        <CardActions sx={{ justifyContent: "space-between", px: 2, pb: 2 }}>
          {actions}
        </CardActions>
      )}
    </Card>
  );
}
