// components/GlobalLayout.js
import React from "react";
import Link from "next/link";
import { AppBar, Toolbar, Typography, Container, Box } from "@mui/material";

export default function GlobalLayout({ children }) {
  return (
    <>
      {/* Header */}
      <AppBar position="static">
        <Toolbar>
          <Typography variant="h6" sx={{ flexGrow: 1 }}>
            <Link href="/" style={{ color: "inherit", textDecoration: "none" }}>
              Mi Plataforma
            </Link>
          </Typography>
          <Link href="/dashboard" style={{ color: "inherit", marginRight: 16, textDecoration: "none" }}>
            Dashboard
          </Link>
          <Link href="/nosotros" style={{ color: "inherit", textDecoration: "none" }}>
            Nosotros
          </Link>
        </Toolbar>
      </AppBar>

      {/* Contenido principal */}
      <Container sx={{ mt: 4, mb: 4 }}>
        {children}
      </Container>

      {/* Footer */}
      <Box component="footer" sx={{ p: 2, backgroundColor: "#f5f5f5", textAlign: "center" }}>
        <Typography variant="body2" color="text.secondary">
          © {new Date().getFullYear()} Mi Plataforma. Todos los derechos reservados.
        </Typography>
      </Box>
    </>
  );
}
