import * as SecureStore from 'expo-secure-store';

export const WEB_API = 'https://www.fapmendoza.com';
export const FAST_API = 'https://api.fapmendoza.online';

const TOKEN_KEY = 'userToken';

export async function getToken(): Promise<string | null> {
  try {
    return await SecureStore.getItemAsync(TOKEN_KEY);
  } catch {
    return null;
  }
}

export async function setToken(token: string): Promise<void> {
  await SecureStore.setItemAsync(TOKEN_KEY, token);
}

export async function removeToken(): Promise<void> {
  await SecureStore.deleteItemAsync(TOKEN_KEY);
}

export function parseJwt(token: string): { sub: number; role: string; name: string } | null {
  try {
    const base64Url = token.split('.')[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = atob(base64);
    return JSON.parse(jsonPayload);
  } catch {
    return null;
  }
}

type FetchOptions = RequestInit & { auth?: boolean };

export async function apiFetch(url: string, options: FetchOptions = {}): Promise<Response> {
  const { auth = true, headers: customHeaders, ...rest } = options;
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(customHeaders as Record<string, string>),
  };

  if (auth) {
    const token = await getToken();
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
  }

  const response = await fetch(url, { headers, ...rest });

  if (response.status === 401) {
    await removeToken();
  }

  return response;
}

export async function apiUpload(url: string, formData: FormData): Promise<Response> {
  const token = await getToken();
  const headers: Record<string, string> = {};
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  return fetch(url, {
    method: 'POST',
    headers,
    body: formData,
  });
}
