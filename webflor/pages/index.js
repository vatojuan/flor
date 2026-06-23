// pages/index.js
import { Box, Container, Typography, Stack, Button } from "@mui/material";
import Link from "next/link";
import PersonSearchIcon from "@mui/icons-material/PersonSearch";
import UploadFileIcon from "@mui/icons-material/UploadFile";
import MainLayout from "../components/MainLayout";

export default function Home() {
  return (
    <MainLayout>
      {/* Fondo de video fijo (decorativo) */}
      <Box
        aria-hidden
        sx={{
          position: "fixed",
          top: 0,
          left: 0,
          width: "100%",
          height: "100%",
          zIndex: -1,
          overflow: "hidden",
          backgroundColor: "#103B40",
        }}
      >
        <Box
          component="video"
          src="/videos/nuevo-fondo.mp4"
          autoPlay
          muted
          loop
          playsInline
          preload="metadata"
          tabIndex={-1}
          sx={{
            display: { xs: "none", sm: "block" },
            width: "100%",
            height: "100%",
            objectFit: "cover",
          }}
        />
        <Box
          component="video"
          src="/videos/video-movil.mp4"
          autoPlay
          muted
          loop
          playsInline
          preload="metadata"
          tabIndex={-1}
          sx={{
            display: { xs: "block", sm: "none" },
            width: "100%",
            height: "100%",
            objectFit: "cover",
          }}
        />
        {/* Overlay con gradiente para legibilidad del texto */}
        <Box
          sx={{
            position: "absolute",
            inset: 0,
            background:
              "linear-gradient(180deg, rgba(16,59,64,0.55) 0%, rgba(16,59,64,0.25) 35%, rgba(16,59,64,0.45) 70%, rgba(16,59,64,0.88) 100%)",
            pointerEvents: "none",
          }}
        />
      </Box>

      {/* Hero en primer plano */}
      <Container
        maxWidth="md"
        sx={{
          minHeight: { xs: "calc(100vh - 60px)", md: "calc(100vh - 70px)" },
          "@supports (height: 100dvh)": {
            minHeight: { xs: "calc(100dvh - 60px)", md: "calc(100dvh - 70px)" },
          },
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          alignItems: "center",
          textAlign: "center",
          py: { xs: 6, md: 8 },
        }}
      >
        <Typography
          variant="h1"
          component="h1"
          sx={{
            color: "#fff",
            textShadow: "0 2px 24px rgba(0,0,0,0.45)",
            mb: 2,
          }}
        >
          Conectamos talento con oportunidades
        </Typography>
        <Typography
          variant="h6"
          component="p"
          sx={{
            color: "rgba(255,255,255,0.92)",
            fontWeight: 400,
            maxWidth: 640,
            mb: { xs: 4, md: 5 },
            textShadow: "0 1px 12px rgba(0,0,0,0.45)",
          }}
        >
          Consultora de Recursos Humanos en Mendoza. Encontramos el personal que
          tu empresa necesita y acompañamos a profesionales a dar su próximo paso.
        </Typography>
        <Stack
          direction={{ xs: "column", sm: "row" }}
          spacing={2}
          sx={{ width: { xs: "100%", sm: "auto" }, maxWidth: 420 }}
        >
          <Button
            component={Link}
            href="/servicios/busqueda"
            variant="contained"
            size="large"
            startIcon={<PersonSearchIcon />}
            sx={{
              backgroundColor: "#D96236",
              color: "#fff",
              borderRadius: "28px",
              px: 4,
              py: 1.5,
              fontSize: "1rem",
              fontWeight: 600,
              width: { xs: "100%", sm: "auto" },
              boxShadow: "0 6px 20px rgba(217,98,54,0.4)",
              "&:hover": { backgroundColor: "#B0482B" },
            }}
          >
            Necesito Personal
          </Button>
          <Button
            component={Link}
            href="/cv/upload"
            variant="outlined"
            size="large"
            startIcon={<UploadFileIcon />}
            sx={{
              color: "#fff",
              borderColor: "rgba(255,255,255,0.7)",
              borderWidth: 2,
              borderRadius: "28px",
              px: 4,
              py: 1.5,
              fontSize: "1rem",
              fontWeight: 600,
              width: { xs: "100%", sm: "auto" },
              "&:hover": {
                borderWidth: 2,
                borderColor: "#fff",
                backgroundColor: "rgba(255,255,255,0.1)",
              },
            }}
          >
            Subir mi CV
          </Button>
        </Stack>
      </Container>
    </MainLayout>
  );
}
