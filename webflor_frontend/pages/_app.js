// pages/_app.js
import '../styles/globals.css';
import { useState, useMemo, useEffect } from 'react';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import Head from 'next/head';

function MyApp({ Component, pageProps }) {
  const [mode, setMode] = useState('light');

  useEffect(() => {
    const stored = localStorage.getItem('adminColorMode');
    if (stored) setMode(stored);
  }, []);

  const toggleDarkMode = () => {
    setMode(prev => {
      const next = prev === 'light' ? 'dark' : 'light';
      localStorage.setItem('adminColorMode', next);
      return next;
    });
  };

  const theme = useMemo(() =>
    createTheme({
      palette: {
        mode,
        primary: { main: '#D96236', dark: '#B0482B' },
        secondary: { main: '#103B40' },
        background: {
          default: mode === 'light' ? '#F2E6CE' : '#2B1B17',
          paper:  mode === 'light' ? '#FFFFFF' : '#3E2723',
        },
        text: {
          primary:   mode === 'light' ? '#3E2723' : '#FAD9CF',
          secondary: mode === 'light' ? '#5D4037' : '#D7CCC8',
        },
      },
      typography: {
        fontFamily: "'Bodoni Moda', serif",
        h1: { fontWeight: 700, fontSize: '2.4rem' },
        h2: { fontWeight: 600, fontSize: '2rem' },
        body1: { fontSize: '1rem', lineHeight: 1.6 },
      },
    })
  , [mode]);

  return (
    <>
      <Head>
        <title>Dashboard Administrativo - FAP Mendoza</title>
        <link rel="icon" href="/favicon.ico" />
      </Head>
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <Component 
          {...pageProps} 
          toggleDarkMode={toggleDarkMode} 
          currentMode={mode} 
        />
      </ThemeProvider>
    </>
  );
}

export default MyApp;
