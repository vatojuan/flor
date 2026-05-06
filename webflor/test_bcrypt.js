const bcrypt = require("bcrypt");

// Reemplazá estos valores con un ejemplo real obtenido en desarrollo:
const plainPassword = "K@8g%1$^Kkqm"; // La contraseña que se envió al usuario
const storedHash = "$2b$12$Fzc.V9V3GwrHS3UcbAHhieLNdVeGWKXO25OExNs5H6gN1ZaxPKKhG";       // El hash que está almacenado en la base de datos

bcrypt.compare(plainPassword, storedHash, (err, result) => {
  if (err) {
    console.error("Error en la comparación:", err);
  } else {
    console.log("Resultado de la comparación:", result);
    // Si result es true, la comparación funcionó correctamente.
  }
});
