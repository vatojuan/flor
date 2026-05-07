import { FAST_API, apiFetch } from './api';

export async function getJobs() {
  const res = await apiFetch(`${FAST_API}/api/job/`, { auth: false });
  if (!res.ok) throw new Error('Error al cargar ofertas');
  return res.json();
}

export async function getJobById(id: string | number) {
  const res = await apiFetch(`${FAST_API}/api/job/${id}`, { auth: false });
  if (!res.ok) throw new Error('Error al cargar oferta');
  return res.json();
}

export async function getEmployerJobs(userId: number) {
  const res = await apiFetch(`${FAST_API}/api/job/?userId=${userId}`);
  if (!res.ok) throw new Error('Error al cargar mis ofertas');
  return res.json();
}

export async function createJob(data: {
  title: string;
  description: string;
  requirements?: string;
  userId: number;
  expirationDate?: string;
}) {
  const res = await apiFetch(`${FAST_API}/api/job/create`, {
    method: 'POST',
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || 'Error al crear oferta');
  }
  return res.json();
}

export async function deleteJob(jobId: number) {
  const res = await apiFetch(`${FAST_API}/api/job/delete/${jobId}`, {
    method: 'DELETE',
  });
  if (!res.ok) throw new Error('Error al eliminar oferta');
  return res.json();
}

export async function applyToJob(jobId: number) {
  const res = await apiFetch(`${FAST_API}/api/job/apply`, {
    method: 'POST',
    body: JSON.stringify({ jobId }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || 'Error al postularse');
  }
  return res.json();
}

export async function getMyApplications() {
  const res = await apiFetch(`${FAST_API}/api/job/my-applications`);
  if (!res.ok) throw new Error('Error al cargar postulaciones');
  return res.json();
}

export async function cancelApplication(applicationId: number) {
  const res = await apiFetch(`${FAST_API}/api/job/cancel-application`, {
    method: 'DELETE',
    body: JSON.stringify({ applicationId }),
  });
  if (!res.ok) throw new Error('Error al cancelar postulacion');
  return res.json();
}

export async function createPaymentPreference(jobId: number, title: string) {
  const res = await apiFetch(`${FAST_API}/api/payments/create-preference`, {
    method: 'POST',
    body: JSON.stringify({ job_id: jobId, title }),
  });
  if (!res.ok) throw new Error('Error al crear preferencia de pago');
  return res.json();
}
