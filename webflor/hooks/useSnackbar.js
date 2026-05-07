// hooks/useSnackbar.js
import { useState, useCallback } from "react";

/**
 * Custom hook for managing snackbar state.
 *
 * Usage:
 *   const { snackbar, showSnackbar, closeSnackbar } = useSnackbar();
 *   showSnackbar("Mensaje", "success");
 */
export default function useSnackbar() {
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: "",
    severity: "success",
  });

  const showSnackbar = useCallback((message, severity = "success") => {
    setSnackbar({ open: true, message, severity });
  }, []);

  const closeSnackbar = useCallback(() => {
    setSnackbar((s) => ({ ...s, open: false }));
  }, []);

  return {
    snackbar,
    showSnackbar,
    closeSnackbar,
  };
}
