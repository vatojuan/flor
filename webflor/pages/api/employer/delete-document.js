// pages/api/employer/delete-document.js
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
    const employerId = Number(session.user.id);
    const { documentId } = req.body;
    
    // Buscar el documento en la tabla legalDocument
    const document = await prisma.legalDocument.findUnique({ where: { id: documentId } });
    if (!document || document.userId !== employerId) {
      return res.status(404).json({ error: 'Documento no encontrado' });
    }
    
    // Guardamos la referencia del archivo (suponiendo que se almacena en fileKey)
    const fileUrl = document.fileKey;
    
    // Eliminamos el documento de la base de datos
    await prisma.legalDocument.delete({ where: { id: documentId } });
    
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
