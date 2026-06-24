import { loadConfig } from './configure';
import type {
  JsonValue,
  JsonObject,
  PaginatedIncidents,
  IncidentDetail,
  SearchResult,
  AnalyticsData,
  SopCompletionsData,
  IncidentNote,
  TenantMember,
  KnowledgeItem,
  KnowledgeTagWithCount,
  IncidentSeverity,
  IncidentSeveritiesData,
  IncidentTask,
  IncidentService,
  RelatedResource,
  ReportDraft,
  PublishedReport,
  ScheduledWorkflow,
  CommanderHistoryEntry,
  Service,
  Risk,
  Integration,
  BlastRadius,
} from './types';

function unwrapDataPayload<T>(json: JsonValue): T {
  if (
    json !== null &&
    typeof json === 'object' &&
    !Array.isArray(json) &&
    'data' in json &&
    (json as { data: JsonValue }).data !== undefined
  ) {
    return (json as { data: T }).data;
  }
  return json as T;
}

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
    if (error instanceof Error && error.name === 'AbortError') {
      throw new Error(`Request timeout after ${timeoutMs}ms`);
    }
    throw error instanceof Error ? error : new Error(String(error));
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

      const json = (await response.json()) as JsonValue;
      return unwrapDataPayload<T>(json);
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      lastError = err;

      // Don't retry non-retryable errors
      if (!err.message.includes('timeout') && !err.message.includes('fetch failed')) {
        throw err;
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

  createIncident: (body: JsonObject) =>
    apiRequest<IncidentDetail>('/v1/incidents', { method: 'POST', body: JSON.stringify(body) }),

  getSopCompletions: (id: string) =>
    apiRequest<SopCompletionsData>(`/v1/incidents/${id}/sop-completions`),

  addIncidentNote: (id: string, body: JsonObject) =>
    apiRequest<IncidentNote>(`/v1/incidents/${id}/notes`, {
      method: 'POST',
      body: JSON.stringify(body),
    }),

  updateIncident: (id: string, body: JsonObject) =>
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

  listMembers: () => apiRequest<TenantMember[]>('/v1/members'),

  listKnowledgeItems: () => apiRequest<KnowledgeItem[]>('/v1/knowledge'),

  searchKnowledgeItems: (query: string, limit?: number) => {
    const q = `query=${encodeURIComponent(query)}${limit !== undefined ? `&limit=${limit}` : ''}`;
    return apiRequest<KnowledgeItem[]>(`/v1/knowledge/search?${q}`);
  },

  listKnowledgeTags: () => apiRequest<KnowledgeTagWithCount[]>('/v1/knowledge/tags'),

  getKnowledgeItem: (knowledgeId: string) => apiRequest<KnowledgeItem>(`/v1/knowledge/${knowledgeId}`),

  createKnowledgeItem: (body: JsonObject) =>
    apiRequest<KnowledgeItem>('/v1/knowledge', { method: 'POST', body: JSON.stringify(body) }),

  updateKnowledgeItem: (knowledgeId: string, body: JsonObject) =>
    apiRequest<KnowledgeItem>(`/v1/knowledge/${knowledgeId}`, {
      method: 'PATCH',
      body: JSON.stringify(body),
    }),

  deleteKnowledgeItem: (knowledgeId: string) =>
    apiRequest<{ success: boolean; message: string }>(`/v1/knowledge/${knowledgeId}`, {
      method: 'DELETE',
    }),

  updateKnowledgeItemTags: (knowledgeId: string, tags: string[]) =>
    apiRequest<KnowledgeItem>(`/v1/knowledge/${knowledgeId}/tags`, {
      method: 'PATCH',
      body: JSON.stringify({ tags }),
    }),

  // Severities
  listIncidentSeverities: (incidentId: string) =>
    apiRequest<IncidentSeveritiesData>(`/v1/incidents/${incidentId}/severities`),

  createIncidentSeverity: (incidentId: string, body: JsonObject) =>
    apiRequest<IncidentSeverity>(`/v1/incidents/${incidentId}/severities`, {
      method: 'POST',
      body: JSON.stringify(body),
    }),

  updateIncidentSeverity: (incidentId: string, severityId: string, body: JsonObject) =>
    apiRequest<IncidentSeverity>(`/v1/incidents/${incidentId}/severities/${severityId}`, {
      method: 'PATCH',
      body: JSON.stringify(body),
    }),

  publishIncidentSeverity: (incidentId: string, severityId: string) =>
    apiRequest<IncidentSeverity>(
      `/v1/incidents/${incidentId}/severities/${severityId}/publish`,
      { method: 'POST', body: '{}' },
    ),

  // Notes
  listIncidentNotes: (incidentId: string) =>
    apiRequest<IncidentNote[]>(`/v1/incidents/${incidentId}/notes`),

  updateIncidentNote: (incidentId: string, noteId: string, body: JsonObject) =>
    apiRequest<IncidentNote>(`/v1/incidents/${incidentId}/notes/${noteId}`, {
      method: 'PATCH',
      body: JSON.stringify(body),
    }),

  deleteIncidentNote: (incidentId: string, noteId: string) =>
    apiRequest<{ id: string; deleted: boolean }>(
      `/v1/incidents/${incidentId}/notes/${noteId}`,
      { method: 'DELETE' },
    ),

  // Tasks
  listIncidentTasks: (incidentId: string) =>
    apiRequest<IncidentTask[]>(`/v1/incidents/${incidentId}/tasks`),

  createIncidentTask: (incidentId: string, body: JsonObject) =>
    apiRequest<IncidentTask>(`/v1/incidents/${incidentId}/tasks`, {
      method: 'POST',
      body: JSON.stringify(body),
    }),

  updateIncidentTask: (incidentId: string, taskId: string, body: JsonObject) =>
    apiRequest<IncidentTask>(`/v1/incidents/${incidentId}/tasks/${taskId}`, {
      method: 'PATCH',
      body: JSON.stringify(body),
    }),

  deleteIncidentTask: (incidentId: string, taskId: string) =>
    apiRequest<{ id: string; deleted: boolean }>(
      `/v1/incidents/${incidentId}/tasks/${taskId}`,
      { method: 'DELETE' },
    ),

  // SOP completions
  completeSopStep: (incidentId: string, stepId: string, body: JsonObject) =>
    apiRequest<JsonObject>(`/v1/incidents/${incidentId}/sop-completions/${stepId}`, {
      method: 'PUT',
      body: JSON.stringify(body),
    }),

  uncompleteSopStep: (incidentId: string, stepId: string) =>
    apiRequest<{ stepId: string; deleted: boolean }>(
      `/v1/incidents/${incidentId}/sop-completions/${stepId}`,
      { method: 'DELETE' },
    ),

  // Commanders
  getIncidentCommanders: (incidentId: string) =>
    apiRequest<{ assignees: Array<{ name: string | null; email: string | null }> }>(
      `/v1/incidents/${incidentId}/commander`,
    ),

  getCommanderHistory: (incidentId: string) =>
    apiRequest<CommanderHistoryEntry[]>(`/v1/incidents/${incidentId}/commander/history`),

  // Services
  getIncidentServices: (incidentId: string) =>
    apiRequest<IncidentService[]>(`/v1/incidents/${incidentId}/services`),

  updateIncidentServices: (incidentId: string, serviceIds: string[]) =>
    apiRequest<IncidentService[]>(`/v1/incidents/${incidentId}/services`, {
      method: 'PATCH',
      body: JSON.stringify({ serviceIds }),
    }),

  // Related resources
  listRelatedResources: (incidentId: string) =>
    apiRequest<RelatedResource[]>(`/v1/incidents/${incidentId}/related-resources`),

  addRelatedResources: (incidentId: string, resourceIds: string[]) =>
    apiRequest<RelatedResource[]>(`/v1/incidents/${incidentId}/related-resources`, {
      method: 'POST',
      body: JSON.stringify({ resourceIds }),
    }),

  deleteRelatedResource: (incidentId: string, resourceId: string) =>
    apiRequest<{ id: string; deleted: boolean }>(
      `/v1/incidents/${incidentId}/related-resources/${resourceId}`,
      { method: 'DELETE' },
    ),

  // Reports
  listReportDrafts: (incidentId: string, draftType?: string) => {
    const qs = draftType ? `?draftType=${encodeURIComponent(draftType)}` : '';
    return apiRequest<ReportDraft[]>(`/v1/incidents/${incidentId}/report-drafts${qs}`);
  },

  createReportDraft: (incidentId: string, body: JsonObject) =>
    apiRequest<ReportDraft>(`/v1/incidents/${incidentId}/report-drafts`, {
      method: 'POST',
      body: JSON.stringify(body),
    }),

  listPublishedReports: (incidentId: string, reportType?: string) => {
    const qs = reportType ? `?reportType=${encodeURIComponent(reportType)}` : '';
    return apiRequest<PublishedReport[]>(`/v1/incidents/${incidentId}/published-reports${qs}`);
  },

  // Scheduled workflows
  listScheduledWorkflows: (incidentId: string) =>
    apiRequest<ScheduledWorkflow[]>(`/v1/incidents/${incidentId}/scheduled-workflows`),

  createScheduledWorkflow: (incidentId: string, body: JsonObject) =>
    apiRequest<ScheduledWorkflow>(`/v1/incidents/${incidentId}/scheduled-workflows`, {
      method: 'POST',
      body: JSON.stringify(body),
    }),

  cancelScheduledWorkflow: (incidentId: string, workflowId: string) =>
    apiRequest<{ id: string; status: string }>(
      `/v1/incidents/${incidentId}/scheduled-workflows/${workflowId}`,
      { method: 'DELETE' },
    ),

  // Members (individual)
  getMember: (memberId: string) => apiRequest<TenantMember>(`/v1/members/${memberId}`),

  updateMember: (memberId: string, body: JsonObject) =>
    apiRequest<TenantMember>(`/v1/members/${memberId}`, {
      method: 'PATCH',
      body: JSON.stringify(body),
    }),

  removeMember: (memberId: string) =>
    apiRequest<{ id: string; deleted: boolean }>(`/v1/members/${memberId}`, {
      method: 'DELETE',
    }),

  // Bulk incidents
  bulkDeleteIncidents: (incidentIds: string[]) =>
    apiRequest<{ deleted: string[]; failed: string[] }>('/v1/incidents/bulk', {
      method: 'DELETE',
      body: JSON.stringify({ incidentIds }),
    }),

  // Blast radius
  getIncidentBlastRadius: (incidentId: string) =>
    apiRequest<BlastRadius>(`/v1/incidents/${incidentId}/blast-radius`),

  // Services (CMDB)
  listServices: (params?: URLSearchParams) =>
    apiRequest<Service[]>(`/v1/services${params ? `?${params.toString()}` : ''}`),

  getService: (serviceId: string) =>
    apiRequest<Service>(`/v1/services/${serviceId}`),

  createService: (body: JsonObject) =>
    apiRequest<Service>('/v1/services', { method: 'POST', body: JSON.stringify(body) }),

  updateService: (serviceId: string, body: JsonObject) =>
    apiRequest<Service>(`/v1/services/${serviceId}`, {
      method: 'PATCH',
      body: JSON.stringify(body),
    }),

  deleteService: (serviceId: string) =>
    apiRequest<{ id: string; deleted: boolean }>(`/v1/services/${serviceId}`, {
      method: 'DELETE',
    }),

  // Risks
  listRisks: (params?: URLSearchParams) =>
    apiRequest<Risk[]>(`/v1/risks${params ? `?${params.toString()}` : ''}`),

  getRisk: (riskId: string) =>
    apiRequest<Risk>(`/v1/risks/${riskId}`),

  createRisk: (body: JsonObject) =>
    apiRequest<Risk>('/v1/risks', { method: 'POST', body: JSON.stringify(body) }),

  updateRisk: (riskId: string, body: JsonObject) =>
    apiRequest<Risk>(`/v1/risks/${riskId}`, { method: 'PATCH', body: JSON.stringify(body) }),

  linkRiskToIncident: (riskId: string, incidentId: string) =>
    apiRequest<{ riskId: string; incidentId: string; linked: boolean }>(
      `/v1/risks/${riskId}/link-incident`,
      { method: 'POST', body: JSON.stringify({ incidentId }) },
    ),

  // Integrations
  listIntegrations: () =>
    apiRequest<Integration[]>('/v1/integrations'),
};
