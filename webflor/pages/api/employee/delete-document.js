// pages/api/employee/delete-document.js
import prisma from '../../../lib/prisma';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../auth/[...nextauth]';
import fetch from 'node-fetch';

export default async function handler(req, res) {
  if (req.method !== 'DELETE') {
    res.setHeader('Allow', ['DELETE']);
    return res.status(405).json({ error: `Método ${req.method} no permitido` });
  }

  try {
    const session = await getServerSession(req, res, authOptions);
    if (!session) return res.status(401).json({ error: 'No autorizado' });
    
    const employeeId = Number(session.user.id);
    const { documentId } = req.body;
    
    // Buscar el documento
    const document = await prisma.employeeDocument.findUnique({ where: { id: documentId } });
    if (!document || document.userId !== employeeId) {
      return res.status(404).json({ error: 'Documento no encontrado' });
    }
    
    // Asumimos que la columna fileKey almacena la referencia del archivo en Google Storage
    const fileUrl = document.fileKey;
    
    // Borrar el documento en la base de datos
    await prisma.employeeDocument.delete({ where: { id: documentId } });
    
    // Enviar webhook a FastAPI para eliminar el embedding asociado
    try {
      const webhookResponse = await fetch("http://127.0.0.1:8000/webhooks/file_deleted", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ file_url: fileUrl })
      });
      const webhookData = await webhookResponse.json();
      console.log("Webhook deletion response:", webhookData);
    } catch (webhookError) {
      console.error("Error al enviar el webhook de eliminación:", webhookError);
    }
    
    return res.status(200).json({ message: 'Documento eliminado correctamente' });
  } catch (error) {
    console.error("Error eliminando el documento:", error);
    return res.status(500).json({ error: 'Error interno al eliminar el documento' });
  }
}
