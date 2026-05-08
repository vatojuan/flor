// components/ui/JobCard.js
import {
  Card,
  CardContent,
  CardActions,
  CardMedia,
  Typography,
  Chip,
  Stack,
  Box,
  useTheme,
  alpha,
} from "@mui/material";
import PersonIcon from "@mui/icons-material/Person";
import CalendarTodayIcon from "@mui/icons-material/CalendarToday";
import ScheduleIcon from "@mui/icons-material/Schedule";
import StarIcon from "@mui/icons-material/Star";
import LocationOnIcon from "@mui/icons-material/LocationOn";
import WorkIcon from "@mui/icons-material/Work";
import AttachMoneyIcon from "@mui/icons-material/AttachMoney";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";

const CONTRACT_LABELS = {
  ocasional: "Ocasional",
  temporal: "Temporal",
  contrato: "Contrato",
  efectivo: "Efectivo",
  freelance: "Freelance",
};

const MODALITY_LABELS = {
  presencial: "Presencial",
  remoto: "Remoto",
  hibrido: "Hibrido",
};

function formatSalary(min, max, visible) {
  if (!visible) return "A convenir";
  if (!min && !max) return null;
  const fmt = (n) =>
    Number(n).toLocaleString("es-AR", { maximumFractionDigits: 0 });
  if (min && max) return `$${fmt(min)} - $${fmt(max)}/mes`;
  if (min) return `Desde $${fmt(min)}/mes`;
  return `Hasta $${fmt(max)}/mes`;
}

/**
 * Reusable job card component.
 *
 * Props:
 * - job: { id, title, createdAt, expirationDate, candidatesCount, label, rubro, is_paid,
 *          banner_url, contract_type, modality, location, salary_min, salary_max,
 *          salary_visible, benefits, tags }
 * - actions: ReactNode rendered in CardActions
 * - highlighted: boolean uses primary-tinted background
 */
export default function JobCard({ job, actions, highlighted = false }) {
  const isFeatured = job.is_paid || job.isPaid;
  const theme = useTheme();

  const publishedAt = job.createdAt || job.created_at || job.jobPostedAt || null;
  const salary = formatSalary(job.salary_min, job.salary_max, job.salary_visible !== false);
  const contractLabel = CONTRACT_LABELS[job.contract_type] || null;
  const modalityLabel = MODALITY_LABELS[job.modality] || null;

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
      {/* Banner image */}
      {job.banner_url && (
        <CardMedia
          component="img"
          height="140"
          image={job.banner_url}
          alt={job.title}
          sx={{ objectFit: "cover" }}
        />
      )}

      <CardContent sx={{ flexGrow: 1 }}>
        {/* Featured badge */}
        {isFeatured && (
          <Chip
            icon={<StarIcon />}
            label="Destacada"
            size="small"
            sx={{ mb: 1, bgcolor: "#FFB300", color: "#fff", fontWeight: 600 }}
          />
        )}

        {/* Title */}
        <Typography variant="h6" gutterBottom sx={{ lineHeight: 1.3 }}>
          {job.title}
        </Typography>

        {/* Rubro */}
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
          {/* Location */}
          {job.location && (
            <Typography
              variant="body2"
              color="text.secondary"
              sx={{ display: "flex", alignItems: "center", gap: 0.5 }}
            >
              <LocationOnIcon fontSize="small" />
              {job.location}
            </Typography>
          )}

          {/* Contract type + Modality */}
          {(contractLabel || modalityLabel) && (
            <Typography
              variant="body2"
              color="text.secondary"
              sx={{ display: "flex", alignItems: "center", gap: 0.5 }}
            >
              <WorkIcon fontSize="small" />
              {[contractLabel, modalityLabel].filter(Boolean).join(" · ")}
            </Typography>
          )}

          {/* Salary */}
          {salary && (
            <Typography
              variant="body2"
              color="text.secondary"
              sx={{ display: "flex", alignItems: "center", gap: 0.5, fontWeight: 500 }}
            >
              <AttachMoneyIcon fontSize="small" />
              {salary}
            </Typography>
          )}

          {/* Benefits */}
          {job.benefits && job.benefits.length > 0 && (
            <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.5, mt: 0.5 }}>
              {job.benefits.slice(0, 3).map((b, i) => (
                <Chip
                  key={i}
                  icon={<CheckCircleIcon />}
                  label={b}
                  size="small"
                  variant="outlined"
                  color="success"
                  sx={{ fontSize: "0.7rem" }}
                />
              ))}
              {job.benefits.length > 3 && (
                <Chip
                  label={`+${job.benefits.length - 3} mas`}
                  size="small"
                  variant="outlined"
                  sx={{ fontSize: "0.7rem" }}
                />
              )}
            </Box>
          )}

          {/* Tags */}
          {job.tags && job.tags.length > 0 && (
            <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.5, mt: 0.5 }}>
              {job.tags.slice(0, 4).map((tag, i) => (
                <Chip
                  key={i}
                  label={`#${tag}`}
                  size="small"
                  sx={{
                    fontSize: "0.7rem",
                    bgcolor: alpha(theme.palette.info.main, 0.1),
                    color: theme.palette.info.dark,
                  }}
                />
              ))}
            </Box>
          )}

          {/* Candidates + Expiration */}
          <Box sx={{ display: "flex", gap: 2, mt: 0.5 }}>
            <Typography
              variant="body2"
              color="text.secondary"
              sx={{ display: "flex", alignItems: "center", gap: 0.5 }}
            >
              <PersonIcon fontSize="small" />
              {job.candidatesCount ?? 0} candidatos
            </Typography>
            <Typography
              variant="body2"
              color={job.expirationDate ? "error" : "text.secondary"}
              sx={{ display: "flex", alignItems: "center", gap: 0.5 }}
            >
              <ScheduleIcon fontSize="small" />
              {job.expirationDate
                ? `Exp ${new Date(job.expirationDate).toLocaleDateString("es-AR", { day: "2-digit", month: "2-digit" })}`
                : "Sin exp."}
            </Typography>
          </Box>
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
