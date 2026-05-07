import {
  Card,
  CardContent,
  CardActions,
  Typography,
  Button,
  Box,
  Chip,
  Avatar,
} from "@mui/material";
import PersonIcon from "@mui/icons-material/Person";
import EmailIcon from "@mui/icons-material/Email";
import PhoneIcon from "@mui/icons-material/Phone";

/** Maximum number of skill chips shown before the "+N more" chip. */
const MAX_VISIBLE_SKILLS = 3;

/**
 * Reusable card for candidate/user listings.
 *
 * Props:
 *  - user: object with { name, profilePictureUrl, rubro, phone, email,
 *          description, skills (string[]) }
 *  - onAction: callback, receives user
 *  - actionLabel: string label for the action button
 */
export default function UserCard({ user, onAction, actionLabel }) {
  const visibleSkills = (user.skills || []).slice(0, MAX_VISIBLE_SKILLS);
  const remainingCount = Math.max(
    0,
    (user.skills || []).length - MAX_VISIBLE_SKILLS
  );

  return (
    <Card
      sx={{
        display: "flex",
        flexDirection: "column",
        height: "100%",
        transition: "box-shadow 0.2s ease-in-out",
        "&:hover": {
          boxShadow: (theme) => theme.shadows[6],
        },
      }}
    >
      <CardContent sx={{ flexGrow: 1 }}>
        {/* Header: Avatar + Name */}
        <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, mb: 1.5 }}>
          <Avatar
            src={user.profilePictureUrl || undefined}
            alt={user.name || "Usuario"}
            sx={{
              width: 56,
              height: 56,
              bgcolor: "primary.main",
            }}
          >
            {!user.profilePictureUrl && <PersonIcon />}
          </Avatar>
          <Box sx={{ minWidth: 0 }}>
            <Typography variant="h6" noWrap>
              {user.name || "Sin nombre"}
            </Typography>
            {user.rubro && (
              <Chip
                label={user.rubro}
                size="small"
                sx={{
                  mt: 0.5,
                  bgcolor: "secondary.main",
                  color: "#fff",
                }}
              />
            )}
          </Box>
        </Box>

        {/* Contact info */}
        {user.phone && (
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              gap: 0.5,
              mt: 1,
            }}
          >
            <PhoneIcon fontSize="small" color="action" />
            <Typography variant="body2" color="text.secondary" noWrap>
              {user.phone}
            </Typography>
          </Box>
        )}
        {user.email && (
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              gap: 0.5,
              mt: 0.5,
            }}
          >
            <EmailIcon fontSize="small" color="action" />
            <Typography
              variant="body2"
              color="text.secondary"
              sx={{
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
              }}
            >
              {user.email}
            </Typography>
          </Box>
        )}

        {/* Description — 2-line clamp */}
        {user.description && (
          <Typography
            variant="body2"
            color="text.secondary"
            sx={{
              mt: 1,
              display: "-webkit-box",
              WebkitLineClamp: 2,
              WebkitBoxOrient: "vertical",
              overflow: "hidden",
              textOverflow: "ellipsis",
            }}
          >
            {user.description}
          </Typography>
        )}

        {/* Skills */}
        {visibleSkills.length > 0 && (
          <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.5, mt: 1.5 }}>
            {visibleSkills.map((skill, idx) => (
              <Chip
                key={idx}
                label={skill}
                size="small"
                variant="outlined"
                sx={{ borderColor: "primary.main", color: "primary.main" }}
              />
            ))}
            {remainingCount > 0 && (
              <Chip
                label={`+${remainingCount} más`}
                size="small"
                sx={{
                  bgcolor: "action.hover",
                  color: "text.secondary",
                }}
              />
            )}
          </Box>
        )}
      </CardContent>

      {onAction && actionLabel && (
        <CardActions sx={{ justifyContent: "flex-end", p: 2, pt: 0 }}>
          <Button
            size="small"
            variant="contained"
            color="primary"
            onClick={() => onAction(user)}
          >
            {actionLabel}
          </Button>
        </CardActions>
      )}
    </Card>
  );
}
