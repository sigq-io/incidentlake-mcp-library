import { loadConfig } from './configure';
import type {
  PaginatedIncidents,
  IncidentDetail,
  SearchResult,
  AnalyticsData,
  SopCompletionsData,
  IncidentNote,
} from './types';

const REQUEST_TIMEOUT_MS = 30000;
const MAX_RETRIES = 3;
const INITIAL_RETRY_DELAY_MS = 1000;

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

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function fetchWithTimeout(
  url: string,
  options: RequestInit,
  timeoutMs: number,
): Promise<Response> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, { ...options, signal: controller.signal });
    clearTimeout(timeoutId);
    return response;
  } catch (error) {
    clearTimeout(timeoutId);
    if ((error as Error).name === 'AbortError') {
      throw new Error(`Request timeout after ${timeoutMs}ms`);
    }
    throw error;
  }
}

async function apiRequest<T>(path: string, options: RequestInit = {}): Promise<T> {
  const { apiUrl, apiToken } = getCredentials();

  const headers = new Headers(options.headers);
  headers.set('Content-Type', 'application/json');
  headers.set('Authorization', `Bearer ${apiToken}`);

  const url = `${apiUrl}${path}`;

  let lastError: Error | null = null;

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
      const response = await fetchWithTimeout(url, { ...options, headers }, REQUEST_TIMEOUT_MS);

      if (!response.ok) {
        // Don't retry 4xx errors (client errors)
        if (response.status >= 400 && response.status < 500 && response.status !== 429) {
          const body = await response.text();
          throw new Error(`API error ${response.status} for ${path}: ${body}`);
        }

        // Retry 429 (rate limited) and 5xx (server errors)
        if (attempt < MAX_RETRIES) {
          const delay = INITIAL_RETRY_DELAY_MS * Math.pow(2, attempt);
          await sleep(delay);
          continue;
        }

        const body = await response.text();
        throw new Error(`API error ${response.status} for ${path}: ${body}`);
      }

      const json = (await response.json()) as unknown;
      if (
        json &&
        typeof json === 'object' &&
        'data' in json &&
        (json as { data: unknown }).data !== undefined
      ) {
        return (json as { data: T }).data;
      }
      return json as T;
    } catch (error) {
      lastError = error as Error;

      // Don't retry non-retryable errors
      if (
        !(error as Error).message.includes('timeout') &&
        !(error as Error).message.includes('fetch failed')
      ) {
        throw error;
      }

      if (attempt < MAX_RETRIES) {
        const delay = INITIAL_RETRY_DELAY_MS * Math.pow(2, attempt);
        await sleep(delay);
        continue;
      }
    }
  }

  throw lastError || new Error('Request failed after retries');
}

export const api = {
  listIncidents: (params: URLSearchParams) =>
    apiRequest<PaginatedIncidents>(`/v1/incidents?${params.toString()}`),

  getIncident: (id: string) => apiRequest<IncidentDetail>(`/v1/incidents/${id}`),

  searchIncidents: (q: string, limit?: number, tags?: string[]) => {
    const params = new URLSearchParams();
    params.set('q', q);
    if (limit !== undefined) params.set('limit', String(limit));
    if (tags) {
      for (const t of tags) {
        params.append('tag', t);
      }
    }
    return apiRequest<SearchResult>(`/v1/incidents/search?${params.toString()}`);
  },

  getAnalytics: (startDate: string, endDate: string) =>
    apiRequest<AnalyticsData>(
      `/v1/incidents/analytics?startDate=${encodeURIComponent(startDate)}&endDate=${encodeURIComponent(endDate)}`,
    ),

  createIncident: (body: Record<string, unknown>) =>
    apiRequest<IncidentDetail>('/v1/incidents', { method: 'POST', body: JSON.stringify(body) }),

  getSopCompletions: (id: string) =>
    apiRequest<SopCompletionsData>(`/v1/incidents/${id}/sop-completions`),

  addIncidentNote: (id: string, body: Record<string, unknown>) =>
    apiRequest<IncidentNote>(`/v1/incidents/${id}/notes`, {
      method: 'POST',
      body: JSON.stringify(body),
    }),

  updateIncident: (id: string, body: Record<string, unknown>) =>
    apiRequest<IncidentDetail>(`/v1/incidents/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(body),
    }),

  resolveIncident: (id: string) =>
    apiRequest<IncidentDetail>(`/v1/incidents/${id}/resolve`, {
      method: 'POST',
      body: '{}',
    }),

  reopenIncident: (id: string) =>
    apiRequest<IncidentDetail>(`/v1/incidents/${id}/reopen`, {
      method: 'POST',
      body: '{}',
    }),

  deleteIncident: (id: string) =>
    apiRequest<{ id: string; deleted: boolean }>(`/v1/incidents/${id}`, { method: 'DELETE' }),

  getIncidentTags: (id: string) => apiRequest<{ tags: string[] }>(`/v1/incidents/${id}/tags`),

  addIncidentTags: (id: string, tags: string[]) =>
    apiRequest<IncidentDetail>(`/v1/incidents/${id}/tags`, {
      method: 'POST',
      body: JSON.stringify({ tags }),
    }),

  updateIncidentTags: (id: string, tags: string[]) =>
    apiRequest<IncidentDetail>(`/v1/incidents/${id}/tags`, {
      method: 'PATCH',
      body: JSON.stringify({ tags }),
    }),

  removeIncidentTags: (id: string, tags: string[]) =>
    apiRequest<IncidentDetail>(`/v1/incidents/${id}/tags`, {
      method: 'DELETE',
      body: JSON.stringify({ tags }),
    }),

  listMembers: () => apiRequest<unknown[]>('/v1/members'),

  listKnowledgeItems: () => apiRequest<unknown[]>('/v1/knowledge'),

  searchKnowledgeItems: (query: string, limit?: number) => {
    const q = `query=${encodeURIComponent(query)}${limit !== undefined ? `&limit=${limit}` : ''}`;
    return apiRequest<unknown[]>(`/v1/knowledge/search?${q}`);
  },

  listKnowledgeTags: () => apiRequest<unknown[]>('/v1/knowledge/tags'),

  getKnowledgeItem: (knowledgeId: string) => apiRequest<unknown>(`/v1/knowledge/${knowledgeId}`),

  createKnowledgeItem: (body: Record<string, unknown>) =>
    apiRequest<unknown>('/v1/knowledge', { method: 'POST', body: JSON.stringify(body) }),

  updateKnowledgeItem: (knowledgeId: string, body: Record<string, unknown>) =>
    apiRequest<unknown>(`/v1/knowledge/${knowledgeId}`, {
      method: 'PATCH',
      body: JSON.stringify(body),
    }),

  deleteKnowledgeItem: (knowledgeId: string) =>
    apiRequest<{ success: boolean; message: string }>(`/v1/knowledge/${knowledgeId}`, {
      method: 'DELETE',
    }),

  updateKnowledgeItemTags: (knowledgeId: string, tags: string[]) =>
    apiRequest<unknown>(`/v1/knowledge/${knowledgeId}/tags`, {
      method: 'PATCH',
      body: JSON.stringify({ tags }),
    }),
};
