// pages/index.js
import { Box } from "@mui/material";
import MainLayout from "../components/MainLayout";

export default function Home() {
  return (
    <MainLayout>
      <Box
        sx={{
          position: "fixed",
          top: 0, left: 0,
          width: "100vw", height: "100vh",
          zIndex: -1,
          overflow: "hidden",
          backgroundColor: "#103B40",
        }}
      >
        <Box
          component="video"
          src="/videos/nuevo-fondo.mp4"
          autoPlay muted loop playsInline
          sx={{
            display: { xs: "none", sm: "block" },
            width: "100%", height: "100%", objectFit: "cover",
          }}
        />
        <Box
          component="video"
          src="/videos/video-movil.mp4"
          autoPlay muted loop playsInline
          sx={{
            display: { xs: "block", sm: "none" },
            width: "100%", height: "100%", objectFit: "cover",
          }}
        />
        {/* Overlay con gradiente sutil para dar profundidad */}
        <Box
          sx={{
            position: "absolute",
            top: 0, left: 0,
            width: "100%", height: "100%",
            background:
              "linear-gradient(180deg, rgba(16,59,64,0.3) 0%, transparent 30%, transparent 60%, rgba(16,59,64,0.5) 100%)",
            pointerEvents: "none",
          }}
        />
      </Box>
    </MainLayout>
  );
}
