// pages/api/employer/upload-profile-picture.js
import { createRouter } from 'next-connect';
import multer from 'multer';
import prisma from '../../../lib/prisma';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../auth/[...nextauth]';
import { uploadFile } from '../../../lib/gcs';
import path from 'path';

const storage = multer.memoryStorage();
const upload = multer({ storage });
const apiRoute = createRouter();

// Middleware para procesar el archivo en el campo "profilePicture"
apiRoute.use(upload.single('profilePicture'));

apiRoute.post(async (req, res) => {
  try {
    // Obtener la sesión segura
    const session = await getServerSession(req, res, authOptions);
    if (!session) return res.status(401).json({ error: 'No autorizado' });
    
    // Convertir el ID del empleador a número
    const employerId = Number(session.user.id);
    const file = req.file;
    if (!file) return res.status(400).json({ error: 'No se ha subido ningún archivo.' });
    
    // Determinar la extensión y crear un nombre único para el archivo
    const ext = path.extname(file.originalname);
    const destination = `${Date.now()}-${Math.round(Math.random() * 1e9)}${ext}`;
    
    // Subir el archivo a Google Cloud Storage y obtener la URL firmada inicial
    const fileUrl = await uploadFile(file.buffer, destination, file.mimetype);
    
    // Actualizar la imagen de perfil en la BD, guardando tanto la URL para uso inmediato 
    // como la referencia del archivo para poder renovar la URL más adelante
    const updatedUser = await prisma.user.update({
      where: { id: employerId },
      data: { 
        profilePicture: fileUrl,
        profilePictureFileName: destination,
      },
    });
    console.log('Imagen de perfil actualizada:', updatedUser);
    return res.status(200).json({ message: 'Imagen de perfil actualizada', user: updatedUser });
  } catch (error) {
    console.error('Error al actualizar la imagen de perfil:', error);
    return res.status(500).json({ error: 'Error al actualizar la imagen de perfil' });
  }
});

export const config = {
  api: { bodyParser: false },
};

export default apiRoute.handler();
