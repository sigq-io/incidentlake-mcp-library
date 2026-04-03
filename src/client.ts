import { loadConfig } from './configure';

function getCredentials(): { apiUrl: string; apiToken: string } {
  // env vars take priority (useful for local dev and CI)
  if (process.env.SIGQ_API_TOKEN) {
    return {
      apiUrl: process.env.SIGQ_API_URL || 'http://localhost:3000/incidentlake/public-api',
      apiToken: process.env.SIGQ_API_TOKEN,
    };
  }
  // fall back to ~/.sigq/config.json (written by `npx incidentlake-mcp configure`)
  const config = loadConfig();
  if (config) {
    return { apiUrl: config.apiUrl, apiToken: config.apiToken };
  }
  throw new Error(
    'No credentials found. Run "npx incidentlake-mcp configure" to set up, or set SIGQ_API_URL and SIGQ_API_TOKEN environment variables.',
  );
}

async function apiRequest<T>(path: string, options: RequestInit = {}): Promise<T> {
  const { apiUrl, apiToken } = getCredentials();

  const headers = new Headers(options.headers);
  headers.set('Content-Type', 'application/json');
  headers.set('Authorization', `Bearer ${apiToken}`);

  const url = `${apiUrl}${path}`;
  const response = await fetch(url, { ...options, headers });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`API error ${response.status} for ${path}: ${body}`);
  }

  const json = (await response.json()) as { success: boolean; data: T };
  return json.data;
}

export const api = {
  listIncidents: (params: URLSearchParams) =>
    apiRequest<unknown>(`/v1/incidents?${params.toString()}`),

  getIncident: (id: string) => apiRequest<unknown>(`/v1/incidents/${id}`),

  searchIncidents: (q: string, limit?: number) =>
    apiRequest<unknown>(
      `/v1/incidents/search?q=${encodeURIComponent(q)}${limit ? `&limit=${limit}` : ''}`,
    ),

  getAnalytics: (startDate: string, endDate: string) =>
    apiRequest<unknown>(
      `/v1/incidents/analytics?startDate=${encodeURIComponent(startDate)}&endDate=${encodeURIComponent(endDate)}`,
    ),

  createIncident: (body: Record<string, unknown>) =>
    apiRequest<unknown>('/v1/incidents', { method: 'POST', body: JSON.stringify(body) }),

  getSopCompletions: (id: string) => apiRequest<unknown>(`/v1/incidents/${id}/sop-completions`),

  addIncidentNote: (id: string, body: Record<string, unknown>) =>
    apiRequest<unknown>(`/v1/incidents/${id}/notes`, { method: 'POST', body: JSON.stringify(body) }),
};
