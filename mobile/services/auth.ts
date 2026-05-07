import { WEB_API, FAST_API, apiFetch } from './api';

export async function loginWithCredentials(email: string, password: string) {
  const res = await apiFetch(`${FAST_API}/auth/login`, {
    method: 'POST',
    body: JSON.stringify({ email: email.toLowerCase(), password }),
    auth: false,
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.detail || 'Error al iniciar sesion');
  }
  return res.json();
}

export async function loginWithGoogle(googleToken: string) {
  const res = await apiFetch(`${FAST_API}/auth/login-google`, {
    method: 'POST',
    body: JSON.stringify({ token: googleToken }),
    auth: false,
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.detail || 'Error con Google login');
  }
  return res.json();
}

export async function register(email: string, name: string, password: string, role: string) {
  const res = await apiFetch(`${WEB_API}/api/auth/register`, {
    method: 'POST',
    body: JSON.stringify({ email: email.toLowerCase(), name, password, role }),
    auth: false,
  });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error || data.message || 'Error al registrarse');
  }
  return data;
}

export async function verifyCode(email: string, code: string) {
  const res = await apiFetch(`${WEB_API}/api/auth/verify-code`, {
    method: 'POST',
    body: JSON.stringify({ email, code }),
    auth: false,
  });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error || data.message || 'Codigo incorrecto');
  }
  return data;
}

export async function resendCode(email: string) {
  const res = await apiFetch(`${WEB_API}/api/auth/resend-code`, {
    method: 'POST',
    body: JSON.stringify({ email }),
    auth: false,
  });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error || data.message || 'Error al reenviar codigo');
  }
  return data;
}

export async function forgotPassword(email: string) {
  const res = await apiFetch(`${WEB_API}/api/auth/forgot-password`, {
    method: 'POST',
    body: JSON.stringify({ email }),
    auth: false,
  });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error || data.message || 'Error al enviar email');
  }
  return data;
}

export async function resetPassword(email: string, token: string, newPassword: string) {
  const res = await apiFetch(`${WEB_API}/api/auth/reset-password`, {
    method: 'POST',
    body: JSON.stringify({ email, token, newPassword }),
    auth: false,
  });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error || data.message || 'Error al resetear contraseña');
  }
  return data;
}

export async function selectRole(email: string, role: string) {
  const res = await apiFetch(`${WEB_API}/api/auth/select-role`, {
    method: 'POST',
    body: JSON.stringify({ email, role }),
  });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error || 'Error al seleccionar rol');
  }
  return data;
}

export async function changePassword(currentPassword: string, newPassword: string) {
  const res = await apiFetch(`${WEB_API}/api/user/change-password`, {
    method: 'POST',
    body: JSON.stringify({ currentPassword, newPassword }),
  });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error || 'Error al cambiar contraseña');
  }
  return data;
}

export async function deleteAccount() {
  const res = await apiFetch(`${WEB_API}/api/user/delete`, {
    method: 'DELETE',
  });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error || 'Error al eliminar cuenta');
  }
  return data;
}
