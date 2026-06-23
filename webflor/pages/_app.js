// pages/_app.js

import { useState, useMemo, useEffect } from "react";
import { SessionProvider } from "next-auth/react";
import { createTheme, ThemeProvider } from "@mui/material/styles";
import CssBaseline from "@mui/material/CssBaseline";
import useMediaQuery from "@mui/material/useMediaQuery";
import Head from "next/head";

export default function App({ Component, pageProps: { session, ...pageProps } }) {
  // 1) Modo claro / oscuro
  const prefersDarkMode = useMediaQuery("(prefers-color-scheme: dark)");
  const [mode, setMode] = useState("light");

  useEffect(() => {
    // Al montarse, leemos si existe "colorMode" en localStorage
    const storedMode = localStorage.getItem("colorMode");
    if (storedMode === "light" || storedMode === "dark") {
      setMode(storedMode);
    } else {
      setMode(prefersDarkMode ? "dark" : "light");
    }
  }, [prefersDarkMode]);

  const toggleDarkMode = () => {
    setMode((prevMode) => {
      const newMode = prevMode === "light" ? "dark" : "light";
      localStorage.setItem("colorMode", newMode);
      return newMode;
    });
  };

  // 2) Generación del tema de MUI
  const theme = useMemo(
    () =>
      createTheme({
        palette: {
          mode,
          primary: {
            main: "#D96236", // color primario
            dark: "#B0482B",
          },
          secondary: {
            main: "#103B40", // color secundario
          },
          accent: {
            main: "#2F4F4F",
          },
          background: {
            default: mode === "light" ? "#F2E6CE" : "#2B1B17",
            paper: mode === "light" ? "#FAF3E8" : "#3E2723",
          },
          text: {
            primary: mode === "light" ? "#3E2723" : "#FAD9CF",
            secondary: mode === "light" ? "#5D4037" : "#D7CCC8",
            accent: "#2F4F4F",
          },
        },
        typography: {
          fontFamily: "'Bodoni Moda', serif",
          h1: {
            fontWeight: 700,
            fontSize: "1.9rem",
            letterSpacing: "-0.02em",
            lineHeight: 1.2,
            "@media (min-width:600px)": { fontSize: "2.5rem" },
            "@media (min-width:900px)": { fontSize: "3rem" },
          },
          h2: {
            fontWeight: 600,
            fontSize: "1.6rem",
            letterSpacing: "-0.01em",
            lineHeight: 1.25,
            "@media (min-width:600px)": { fontSize: "2rem" },
            "@media (min-width:900px)": { fontSize: "2.4rem" },
          },
          h3: {
            fontWeight: 600,
            fontSize: "1.35rem",
            lineHeight: 1.3,
            "@media (min-width:600px)": { fontSize: "1.55rem" },
            "@media (min-width:900px)": { fontSize: "1.8rem" },
          },
          h4: {
            fontWeight: 600,
            fontSize: "1.25rem",
            lineHeight: 1.3,
            "@media (min-width:600px)": { fontSize: "1.5rem" },
            "@media (min-width:900px)": { fontSize: "1.85rem" },
          },
          h5: {
            fontWeight: 600,
            fontSize: "1.1rem",
            lineHeight: 1.35,
            "@media (min-width:600px)": { fontSize: "1.3rem" },
            "@media (min-width:900px)": { fontSize: "1.5rem" },
          },
          h6: {
            fontWeight: 500,
            fontSize: "1.05rem",
            "@media (min-width:900px)": { fontSize: "1.15rem" },
          },
          body1: {
            fontSize: "1rem",
            lineHeight: 1.7,
            "@media (min-width:900px)": { fontSize: "1.125rem", lineHeight: 1.75 },
          },
          body2: {
            fontSize: "0.95rem",
            lineHeight: 1.65,
            "@media (min-width:900px)": { fontSize: "1rem", lineHeight: 1.7 },
          },
          button: {
            textTransform: "none",
            fontWeight: 600,
            letterSpacing: "0.02em",
          },
        },
      }),
    [mode]
  );

  // 3) Sincronizar la sesión de NextAuth con localStorage
  //    Guardamos en localStorage “userToken” cada vez que cambie session.user.token.
  useEffect(() => {
    if (typeof window === "undefined") return;

    if (session?.user?.token) {
      // Si existe token en la sesión, lo guardamos
      localStorage.setItem("userToken", session.user.token);
    } else {
      // Si no hay sesión o no hay token, lo removemos
      localStorage.removeItem("userToken");
    }
  }, [session]);

  return (
    <SessionProvider session={session}>
      <Head>
        <meta
          name="viewport"
          content="width=device-width, initial-scale=1, viewport-fit=cover"
        />
        <link rel="icon" href="/favicon.ico" />
        <title>FAP Mendoza</title>
      </Head>
      <ThemeProvider theme={theme}>
        {/* CssBaseline para normalizar estilos de MUI */}
        <CssBaseline />
        {/* 
          Pasamos toggleDarkMode y currentMode como props
          para que cualquier página los reciba si los necesita.
        */}
        <Component {...pageProps} toggleDarkMode={toggleDarkMode} currentMode={mode} />
      </ThemeProvider>
    </SessionProvider>
  );
}
