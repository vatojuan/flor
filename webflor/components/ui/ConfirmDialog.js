import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Typography,
  Button,
  Box,
} from "@mui/material";
import WarningAmberIcon from "@mui/icons-material/WarningAmber";
import ErrorOutlineIcon from "@mui/icons-material/ErrorOutline";

/**
 * Reusable confirmation dialog.
 *
 * Props:
 *  - open: boolean
 *  - title: string
 *  - message: string or ReactNode
 *  - onConfirm: callback
 *  - onCancel: callback
 *  - confirmText: string (default "Confirmar")
 *  - cancelText: string (default "Cancelar")
 *  - severity: "warning" | "error" (default "warning")
 *
 * Backwards-compatible aliases:
 *  - confirmLabel / cancelLabel / confirmColor still work
 */
export default function ConfirmDialog({
  open,
  title,
  message,
  onConfirm,
  onCancel,
  confirmText,
  cancelText,
  confirmLabel,
  cancelLabel,
  confirmColor,
  severity = "warning",
}) {
  const isError = severity === "error" || confirmColor === "error";
  const Icon = isError ? ErrorOutlineIcon : WarningAmberIcon;

  // Support old prop names as fallbacks
  const resolvedConfirmText = confirmText || confirmLabel || "Confirmar";
  const resolvedCancelText = cancelText || cancelLabel || "Cancelar";

  return (
    <Dialog
      open={open}
      onClose={onCancel}
      maxWidth="xs"
      fullWidth
      PaperProps={{
        sx: { borderRadius: 2 },
      }}
    >
      <DialogTitle
        sx={{
          display: "flex",
          alignItems: "center",
          gap: 1,
        }}
      >
        <Icon
          sx={{
            color: isError ? "error.main" : "warning.main",
            fontSize: 28,
          }}
        />
        {title}
      </DialogTitle>
      <DialogContent>
        {typeof message === "string" ? (
          <Typography variant="body1">{message}</Typography>
        ) : (
          message
        )}
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={onCancel} color="inherit">
          {resolvedCancelText}
        </Button>
        <Button
          onClick={onConfirm}
          variant="contained"
          color={isError ? "error" : "warning"}
          autoFocus
        >
          {resolvedConfirmText}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
