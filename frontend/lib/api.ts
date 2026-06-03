const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

export function apiUrl(path: string) {
  return `${API_BASE_URL}${path}`;
}

function getHeaders(userId: string): Record<string, string> {
  const headers: Record<string, string> = { 'x-user-id': userId };
  const householdId = localStorage.getItem('householdId');
  if (householdId) headers['x-household-id'] = householdId;
  return headers;
}

export function apiFetch(path: string, userId: string, options?: RequestInit) {
  const headers = { ...getHeaders(userId), ...options?.headers };
  return fetch(apiUrl(path), { ...options, headers });
}
