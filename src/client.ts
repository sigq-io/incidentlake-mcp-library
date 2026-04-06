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

      const json = (await response.json()) as { success: boolean; data: T };
      return json.data;
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

  searchIncidents: (q: string, limit?: number) =>
    apiRequest<SearchResult>(
      `/v1/incidents/search?q=${encodeURIComponent(q)}${limit ? `&limit=${limit}` : ''}`,
    ),

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
};
