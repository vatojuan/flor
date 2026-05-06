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
            paper: mode === "light" ? "#FFFFFF" : "#3E2723",
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
            fontSize: "2.4rem",
          },
          h2: {
            fontWeight: 600,
            fontSize: "2rem",
          },
          h6: {
            fontWeight: 500,
          },
          body1: {
            fontSize: "1rem",
            lineHeight: 1.6,
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
