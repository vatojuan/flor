// components/PublicLayout.js
import { ThemeProvider, createTheme } from "@mui/material/styles";
import CssBaseline from "@mui/material/CssBaseline";
import Head from "next/head";

export default function PublicLayout({ children, toggleDarkMode, currentMode }) {
  // Si no se pasa currentMode, se asume "light" por defecto
  const mode = currentMode || "light";

  const theme = createTheme({
    palette: {
      mode,
      primary: { main: "#D96236", dark: "#B0482B" },
      secondary: { main: "#103B40" },
      background: {
        default: mode === "light" ? "#F2E6CE" : "#2B1B17",
        paper: mode === "light" ? "#FFFFFF" : "#3E2723",
      },
      text: {
        primary: mode === "light" ? "#3E2723" : "#FAD9CF",
      },
    },
    typography: {
      fontFamily: "'Bodoni Moda', serif",
    },
  });

  return (
    <>
      <Head>
        <link rel="icon" href="/favicon.ico" />
        <title>FAP Mendoza</title>
      </Head>
      <ThemeProvider theme={theme}>
        <CssBaseline />
        {children}
      </ThemeProvider>
    </>
  );
}
