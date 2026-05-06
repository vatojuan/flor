// pages/index.js
import { Box } from "@mui/material";
import MainLayout from "../components/MainLayout"; // 1. Importamos el layout centralizado

export default function Home() {
  return (
    // 2. Envolvemos el contenido de la página con MainLayout.
    // MainLayout se encargará de renderizar el header, footer, etc.
    <MainLayout>
      {/* Contenedor para los videos de fondo */}
      <Box
        sx={{
          position: 'fixed', // Fijo para que se mantenga en el fondo
          top: 0,
          left: 0,
          width: '100vw',
          height: '100vh',
          zIndex: -1, // Se posiciona detrás de todo el contenido del layout
          overflow: 'hidden',
          backgroundColor: '#103B40', // Color de fondo mientras carga el video
        }}
      >
        {/* VIDEO DE FONDO PARA ESCRITORIO */}
        <Box
          component="video"
          src="/videos/nuevo-fondo.mp4"
          autoPlay
          muted
          loop
          playsInline
          sx={{
            display: { xs: "none", sm: "block" },
            width: "100%",
            height: "100%",
            objectFit: "cover",
          }}
        />

        {/* VIDEO DE FONDO PARA MÓVILES */}
        <Box
          component="video"
          src="/videos/video-movil.mp4"
          autoPlay
          muted
          loop
          playsInline
          sx={{
            display: { xs: "block", sm: "none" },
            width: "100%",
            height: "100%",
            objectFit: "cover", // 'cover' suele verse mejor que 'contain' en móviles
          }}
        />
      </Box>

      {/* El contenido visible de la página de inicio iría aquí.
        Si la página es solo el video de fondo, no necesitas añadir nada más.
        El MainLayout ya tiene un flexGrow que empuja el footer hacia abajo,
        creando un espacio flexible en el medio.
      */}
    </MainLayout>
  );
}
