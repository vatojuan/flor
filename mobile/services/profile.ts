import { WEB_API, FAST_API, apiFetch, apiUpload } from './api';

export async function getEmployeeProfile() {
  const res = await apiFetch(`${WEB_API}/api/employee/profile`);
  if (!res.ok) throw new Error('Error al cargar perfil');
  return res.json();
}

export async function updateEmployeeProfile(data: {
  name?: string;
  phone?: string;
  description?: string;
}) {
  const res = await apiFetch(`${WEB_API}/api/employee/profile`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error('Error al actualizar perfil');
  return res.json();
}

export async function getEmployerProfile() {
  const res = await apiFetch(`${WEB_API}/api/employer/profile`);
  if (!res.ok) throw new Error('Error al cargar perfil');
  return res.json();
}

export async function updateEmployerProfile(data: {
  name?: string;
  companyName?: string;
  description?: string;
  phone?: string;
}) {
  const res = await apiFetch(`${WEB_API}/api/employer/profile`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error('Error al actualizar perfil');
  return res.json();
}

export async function uploadProfilePicture(uri: string, type: 'employee' | 'employer') {
  const formData = new FormData();
  const filename = uri.split('/').pop() || 'photo.jpg';
  const match = /\.(\w+)$/.exec(filename);
  const mimeType = match ? `image/${match[1]}` : 'image/jpeg';

  formData.append('profilePicture', {
    uri,
    name: filename,
    type: mimeType,
  } as any);

  const res = await apiUpload(`${WEB_API}/api/${type}/upload-profile-picture`, formData);
  if (!res.ok) throw new Error('Error al subir foto');
  return res.json();
}

export async function getDocuments(type: 'employee' | 'employer') {
  const res = await apiFetch(`${WEB_API}/api/${type}/documents`);
  if (!res.ok) throw new Error('Error al cargar documentos');
  return res.json();
}

export async function uploadDocument(uri: string, name: string, type: 'employee' | 'employer') {
  const formData = new FormData();
  const match = /\.(\w+)$/.exec(name);
  const mimeType = match ? `application/${match[1]}` : 'application/octet-stream';

  formData.append('document', {
    uri,
    name,
    type: mimeType,
  } as any);

  const res = await apiUpload(`${WEB_API}/api/${type}/upload-document`, formData);
  if (!res.ok) throw new Error('Error al subir documento');
  return res.json();
}

export async function deleteDocument(docId: number, type: 'employee' | 'employer') {
  const res = await apiFetch(`${WEB_API}/api/${type}/delete-document`, {
    method: 'DELETE',
    body: JSON.stringify({ documentId: docId }),
  });
  if (!res.ok) throw new Error('Error al eliminar documento');
  return res.json();
}

export async function getSignedUrl(fileName: string, type: 'employee' | 'employer') {
  const res = await apiFetch(`${WEB_API}/api/${type}/get-signed-url?fileName=${encodeURIComponent(fileName)}`);
  if (!res.ok) throw new Error('Error al obtener URL');
  return res.json();
}

export async function toggleActive() {
  const res = await apiFetch(`${FAST_API}/api/users/toggle-active`, {
    method: 'PATCH',
  });
  if (!res.ok) throw new Error('Error al cambiar estado');
  return res.json();
}

export async function getCandidateProfile(id: string | number) {
  const res = await apiFetch(`${FAST_API}/api/users/${id}/public-profile`, { auth: false });
  if (!res.ok) throw new Error('Error al cargar perfil del candidato');
  return res.json();
}
