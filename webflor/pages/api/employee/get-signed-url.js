// pages/api/employee/get-signed-url.js
import { getNewSignedUrl } from '../../../lib/gcs';

export default async function handler(req, res) {
  const { fileName } = req.query; // fileName es la referencia (por ejemplo, "destination")
  if (!fileName) {
    return res.status(400).json({ error: "Falta el parámetro fileName" });
  }
  try {
    const url = await getNewSignedUrl(fileName);
    return res.status(200).json({ url });
  } catch (error) {
    console.error("Error generando URL firmada:", error);
    return res.status(500).json({ error: "Error generando URL firmada" });
  }
}
