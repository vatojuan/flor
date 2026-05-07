import { Box, Typography } from "@mui/material";

/**
 * Consistent page header with title, optional subtitle, and action buttons.
 *
 * Props:
 *  - title: string
 *  - subtitle: string (optional)
 *  - actions: ReactNode (optional — buttons or other controls)
 *  - sx: object (optional) — extra styles for the wrapper Box
 */
export default function PageHeader({ title, subtitle, actions, sx = {} }) {
  return (
    <Box
      sx={{
        display: "flex",
        flexDirection: { xs: "column", sm: "row" },
        alignItems: { xs: "flex-start", sm: "center" },
        justifyContent: "space-between",
        gap: 2,
        mb: 3,
        mt: 4,
        px: 2,
        ...sx,
      }}
    >
      <Box>
        <Typography variant="h4" component="h1" fontWeight={600}>
          {title}
        </Typography>
        {subtitle && (
          <Typography variant="body1" color="text.secondary" sx={{ mt: 0.5 }}>
            {subtitle}
          </Typography>
        )}
      </Box>
      {actions && (
        <Box
          sx={{
            display: "flex",
            gap: 1,
            flexShrink: 0,
          }}
        >
          {actions}
        </Box>
      )}
    </Box>
  );
}
