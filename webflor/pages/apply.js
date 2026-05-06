// pages/apply.js
import { useRouter } from "next/router";
import { useEffect } from "react";
import { Box, Typography, CircularProgress } from "@mui/material";

export default function Apply() {
  const router = useRouter();
  const { token } = router.query;          // ?token=123

  useEffect(() => {
    if (!token) return;

    (async () => {
      try {
        const api = process.env.NEXT_PUBLIC_API_URL   // https://api.fapmendoza.online
              || "https://api.fapmendoza.online";

        const r   = await fetch(`${api}/api/job/apply/${token}`);
        const data = await r.json();

        // si la API devolvió un JWT => lo guardamos para que useAuthUser lo detecte
        if (r.ok && data.token) {
          localStorage.setItem("userToken", data.token);
        }

      } catch (e) {
        /* podemos loguear algo si querés */
      } finally {
        // siempre redirigir a la portada
        router.replace("/");
      }
    })();
  }, [token]);

  return (
    <Box sx={{ textAlign:"center", mt:10 }}>
      <Typography variant="h6">Confirmando tu postulación…</Typography>
      <CircularProgress sx={{ mt:2 }}/>
    </Box>
  );
}
