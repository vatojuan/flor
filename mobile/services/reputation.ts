import { FAST_API, apiFetch } from './api';

// ── Reviews ──

export async function createReview(data: {
  candidate_id: number;
  job_id?: number;
  rating: number;
  comment?: string;
}) {
  const res = await apiFetch(`${FAST_API}/api/reputation/reviews`, {
    method: 'POST',
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || 'Error al guardar reseña');
  }
  return res.json();
}

export async function getCandidateReviews(candidateId: number) {
  const res = await apiFetch(`${FAST_API}/api/reputation/reviews/${candidateId}`, { auth: false });
  if (!res.ok) throw new Error('Error al cargar reseñas');
  return res.json();
}

export async function getReputationSummary(candidateId: number) {
  const res = await apiFetch(`${FAST_API}/api/reputation/summary/${candidateId}`, { auth: false });
  if (!res.ok) throw new Error('Error al cargar reputación');
  return res.json();
}

// ── Favorites ──

export async function addFavorite(candidateId: number) {
  const res = await apiFetch(`${FAST_API}/api/reputation/favorites`, {
    method: 'POST',
    body: JSON.stringify({ candidate_id: candidateId }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || 'Error al agregar favorito');
  }
  return res.json();
}

export async function removeFavorite(candidateId: number) {
  const res = await apiFetch(`${FAST_API}/api/reputation/favorites/${candidateId}`, {
    method: 'DELETE',
  });
  if (!res.ok) throw new Error('Error al quitar favorito');
  return res.json();
}

export async function getMyFavorites() {
  const res = await apiFetch(`${FAST_API}/api/reputation/favorites`);
  if (!res.ok) throw new Error('Error al cargar favoritos');
  return res.json();
}

export async function isFavorite(candidateId: number) {
  const res = await apiFetch(`${FAST_API}/api/reputation/is-favorite/${candidateId}`);
  if (!res.ok) return { isFavorite: false };
  return res.json();
}
