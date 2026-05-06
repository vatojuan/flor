const express = require("express");
const { createProxyMiddleware } = require("http-proxy-middleware");
const path = require("path");
const cors = require("cors");

const app = express();
const PORT = process.env.PORT || 3000;
const API_URL = process.env.API_URL || "http://127.0.0.1:8000"; // URL dinámica para backend

// Middleware para CORS (permitir conexiones entre frontend y backend)
app.use(cors());

// Servir archivos estáticos (si tienes frontend en React o Next.js)
app.use(express.static(path.join(__dirname, "frontend")));

// Proxy para redirigir a FastAPI en Render (o localhost en desarrollo)
app.use(
  "/cv",
  createProxyMiddleware({
    target: API_URL,
    changeOrigin: true,
  })
);

// Ruta principal
app.get("/", (req, res) => {
  res.send("Bienvenido a Webflor Admin 🚀");
});

// Iniciar servidor Express
app.listen(PORT, () => {
  console.log(`Servidor Express corriendo en http://localhost:${PORT}`);
  console.log(`Redirigiendo API a: ${API_URL}`);
});
