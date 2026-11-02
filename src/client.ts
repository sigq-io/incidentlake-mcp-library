import { access, constants, mkdir, readFile, realpath, stat, writeFile } from 'node:fs/promises';
import { homedir } from 'node:os';
import { basename, dirname, extname, isAbsolute, join, resolve } from 'node:path';
import { loadConfig } from './configure';
import { getScopedCredentials, type Credentials } from './credentials';
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
  CurrentTenant,
  PendingKnowledgeDraft,
  ApprovedKnowledgeDraft,
  GitHubSearchHit,
  IntegrationConnectionProvider,
  IntegrationConnectionTest,
  JiraSearchHit,
  NotionSearchHit,
  MeetingBotSession,
  OutlookMail,
  OutlookMailPreview,
  GrafanaResource,
  SentryIssue,
  RollbarItem,
  IncidentSeverity,
  IncidentSeveritiesData,
  IncidentTask,
  IncidentService,
  RelatedResource,
  SlackThread,
  ReportDraft,
  PublishedReport,
  ScheduledWorkflow,
  CommanderHistoryEntry,
  Service,
  Risk,
  Integration,
  BlastRadius,
  RbacTag,
  PhaseGraph,
  PhaseNode,
  PhaseEdge,
  PhaseCapture,
  IncidentPhaseTelemetry,
  ZabbixProblem,
  InstanaEvent,
  ServiceDependency,
  CmdbGraphBatchResult,
  CmdbGraphPendingChanges,
  RecordedGraphVersion,
  CmdbGraphVersionHistoryResult,
  CmdbGraphVersionDetail,
  DrillCatalogEntry,
  DrillDebrief,
  DrillDecision,
  DrillDecisionResult,
  DrillImprovementItem,
  DrillIndustryProfile,
  DrillScenario,
  DrillSession,
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
// Approval translates the draft and writes embeddings before responding.
const APPROVE_KNOWLEDGE_DRAFT_TIMEOUT_MS = 120_000;
// Recording a decision can call the facilitator model; generating a debrief always does.
const DRILL_LLM_TIMEOUT_MS = 120_000;
const MAX_RETRIES = 3;
const INITIAL_RETRY_DELAY_MS = 1000;

function getCredentials(): Credentials {
  // per-request credentials (remote HTTP mode) take priority over everything else
  const scoped = getScopedCredentials();
  if (scoped) {
    return scoped;
  }
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

/**
 * @param maxRetries Overrides MAX_RETRIES. Pass 0 for a non-idempotent mutation where a
 * retry after an ambiguous failure (timeout, dropped connection) risks re-applying a
 * request whose effects can't be told apart from a fresh one server-side — e.g. a batch
 * that creates new rows, or an action that's recorded once per call. A response that
 * 4xx errors other than 429 are never retried; 429/5xx responses and timeouts/network
 * failures are retried up to maxRetries.
 * @param timeoutMs Overrides REQUEST_TIMEOUT_MS for a call whose server work (translation,
 * embedding, a large download) can outlast the default.
 * @param emptyAsUndefined Return `undefined` instead of `null` for an empty response body, so a
 * caller can tell it from a JSON `null`.
 */
async function apiRequest<T>(
  path: string,
  options: RequestInit = {},
  maxRetries: number = MAX_RETRIES,
  timeoutMs: number = REQUEST_TIMEOUT_MS,
  emptyAsUndefined = false,
): Promise<T> {
  const { apiUrl, apiToken } = getCredentials();

  const headers = new Headers(options.headers);
  headers.set('Content-Type', 'application/json');
  headers.set('Authorization', `Bearer ${apiToken}`);

  const url = `${apiUrl}${path}`;

  let lastError: Error | null = null;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const response = await fetchWithTimeout(url, { ...options, headers }, timeoutMs);

      if (!response.ok) {
        // Don't retry 4xx errors (client errors)
        if (response.status >= 400 && response.status < 500 && response.status !== 429) {
          const body = await response.text();
          throw new Error(`API error ${response.status} for ${path}: ${body}`);
        }

        // Retry 429 (rate limited) and 5xx (server errors)
        if (attempt < maxRetries) {
          const delay = INITIAL_RETRY_DELAY_MS * Math.pow(2, attempt);
          await sleep(delay);
          continue;
        }

        const body = await response.text();
        throw new Error(`API error ${response.status} for ${path}: ${body}`);
      }

      const text = await response.text();
      if (!text) return (emptyAsUndefined ? undefined : null) as T;
      return unwrapDataPayload<T>(JSON.parse(text) as JsonValue);
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      lastError = err;

      // Don't retry non-retryable errors
      if (!err.message.includes('timeout') && !err.message.includes('fetch failed')) {
        throw err;
      }

      if (attempt < maxRetries) {
        const delay = INITIAL_RETRY_DELAY_MS * Math.pow(2, attempt);
        await sleep(delay);
        continue;
      }
    }
  }

  throw lastError || new Error('Request failed after retries');
}

/** Drill incidents stay hidden unless the caller opts in. Omitted or false keeps today's default. */
export function withIncludeDrills(path: string, includeDrills?: boolean): string {
  if (includeDrills !== true) return path;
  return path.includes('?') ? `${path}&includeDrills=true` : `${path}?includeDrills=true`;
}

export type IncludeDrillsOpts = { includeDrills?: boolean };

export const api = {
  getCurrentTenant: () => apiRequest<CurrentTenant>('/v1/me'),

  listIncidents: (params: URLSearchParams) =>
    apiRequest<PaginatedIncidents>(`/v1/incidents?${params.toString()}`),

  getIncident: (id: string, opts?: IncludeDrillsOpts) =>
    apiRequest<IncidentDetail>(withIncludeDrills(`/v1/incidents/${id}`, opts?.includeDrills)),

  searchIncidents: (
    q: string,
    limit?: number,
    tags?: string[],
    options?: { category?: string[]; includeDrills?: boolean },
  ) => {
    const params = new URLSearchParams();
    params.set('q', q);
    if (limit !== undefined) params.set('limit', String(limit));
    if (tags) {
      for (const t of tags) {
        params.append('tag', t);
      }
    }
    for (const category of options?.category ?? []) params.append('category', category);
    if (options?.includeDrills) params.set('includeDrills', 'true');
    return apiRequest<SearchResult>(`/v1/incidents/search?${params.toString()}`);
  },

  getAnalytics: (startDate: string, endDate: string, includeDrills?: boolean) =>
    apiRequest<AnalyticsData>(
      withIncludeDrills(
        `/v1/incidents/analytics?startDate=${encodeURIComponent(startDate)}&endDate=${encodeURIComponent(endDate)}`,
        includeDrills,
      ),
    ),

  createIncident: (body: JsonObject) =>
    apiRequest<IncidentDetail>('/v1/incidents', { method: 'POST', body: JSON.stringify(body) }),

  getSopCompletions: (id: string, opts?: IncludeDrillsOpts) =>
    apiRequest<SopCompletionsData>(
      withIncludeDrills(`/v1/incidents/${id}/sop-completions`, opts?.includeDrills),
    ),

  addIncidentNote: (id: string, body: JsonObject, opts?: IncludeDrillsOpts) =>
    apiRequest<IncidentNote>(withIncludeDrills(`/v1/incidents/${id}/notes`, opts?.includeDrills), {
      method: 'POST',
      body: JSON.stringify(body),
    }),

  // Severity publishes a new history row. A retry after a timeout or 5xx would
  // insert a duplicate, so those bodies are not retried. Other fields replace in place.
  updateIncident: (id: string, body: JsonObject, opts?: IncludeDrillsOpts) =>
    apiRequest<IncidentDetail>(
      withIncludeDrills(`/v1/incidents/${id}`, opts?.includeDrills),
      { method: 'PATCH', body: JSON.stringify(body) },
      body.severity !== undefined ? 0 : MAX_RETRIES,
    ),

  resolveIncident: (id: string, opts?: IncludeDrillsOpts) =>
    apiRequest<IncidentDetail>(withIncludeDrills(`/v1/incidents/${id}/resolve`, opts?.includeDrills), {
      method: 'POST',
      body: '{}',
    }),

  reopenIncident: (id: string, opts?: IncludeDrillsOpts) =>
    apiRequest<IncidentDetail>(withIncludeDrills(`/v1/incidents/${id}/reopen`, opts?.includeDrills), {
      method: 'POST',
      body: '{}',
    }),

  deleteIncident: (id: string, opts?: IncludeDrillsOpts) =>
    apiRequest<{ id: string; deleted: boolean }>(
      withIncludeDrills(`/v1/incidents/${id}`, opts?.includeDrills),
      { method: 'DELETE' },
    ),

  getIncidentTags: (id: string, opts?: IncludeDrillsOpts) =>
    apiRequest<{ tags: string[] }>(withIncludeDrills(`/v1/incidents/${id}/tags`, opts?.includeDrills)),

  addIncidentTags: (id: string, tags: string[], opts?: IncludeDrillsOpts) =>
    apiRequest<IncidentDetail>(withIncludeDrills(`/v1/incidents/${id}/tags`, opts?.includeDrills), {
      method: 'POST',
      body: JSON.stringify({ tags }),
    }),

  updateIncidentTags: (id: string, tags: string[], opts?: IncludeDrillsOpts) =>
    apiRequest<IncidentDetail>(withIncludeDrills(`/v1/incidents/${id}/tags`, opts?.includeDrills), {
      method: 'PATCH',
      body: JSON.stringify({ tags }),
    }),

  removeIncidentTags: (id: string, tags: string[], opts?: IncludeDrillsOpts) =>
    apiRequest<IncidentDetail>(withIncludeDrills(`/v1/incidents/${id}/tags`, opts?.includeDrills), {
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

  listPendingKnowledgeDrafts: () =>
    apiRequest<PendingKnowledgeDraft[]>('/v1/knowledge/pending-drafts'),

  // approveKnowledgeDraft and dismissKnowledgeDraft are NOT retried: each leaves the draft
  // no longer pending, so a retry after a timeout surfaces as a 404 instead of the result.
  // Approval also translates the draft and writes embeddings before responding, so it uses
  // the same 120s budget as incident export rather than the 30s default.
  approveKnowledgeDraft: (knowledgeId: string) =>
    apiRequest<ApprovedKnowledgeDraft>(
      `/v1/knowledge/${knowledgeId}/approve`,
      { method: 'POST' },
      0,
      APPROVE_KNOWLEDGE_DRAFT_TIMEOUT_MS,
    ),

  dismissKnowledgeDraft: (knowledgeId: string) =>
    apiRequest<{ success: boolean; id: string }>(
      `/v1/knowledge/${knowledgeId}/dismiss`,
      { method: 'POST' },
      0,
    ),

  // Severities
  listIncidentSeverities: (incidentId: string, opts?: IncludeDrillsOpts) =>
    apiRequest<IncidentSeveritiesData>(
      withIncludeDrills(`/v1/incidents/${incidentId}/severities`, opts?.includeDrills),
    ),

  createIncidentSeverity: (incidentId: string, body: JsonObject, opts?: IncludeDrillsOpts) =>
    apiRequest<IncidentSeverity>(
      withIncludeDrills(`/v1/incidents/${incidentId}/severities`, opts?.includeDrills),
      {
        method: 'POST',
        body: JSON.stringify(body),
      },
    ),

  updateIncidentSeverity: (
    incidentId: string,
    severityId: string,
    body: JsonObject,
    opts?: IncludeDrillsOpts,
  ) =>
    apiRequest<IncidentSeverity>(
      withIncludeDrills(`/v1/incidents/${incidentId}/severities/${severityId}`, opts?.includeDrills),
      {
        method: 'PATCH',
        body: JSON.stringify(body),
      },
    ),

  publishIncidentSeverity: (incidentId: string, severityId: string, opts?: IncludeDrillsOpts) =>
    apiRequest<IncidentSeverity>(
      withIncludeDrills(
        `/v1/incidents/${incidentId}/severities/${severityId}/publish`,
        opts?.includeDrills,
      ),
      { method: 'POST', body: '{}' },
    ),

  // Notes
  listIncidentNotes: (incidentId: string, opts?: IncludeDrillsOpts) =>
    apiRequest<IncidentNote[]>(
      withIncludeDrills(`/v1/incidents/${incidentId}/notes`, opts?.includeDrills),
    ),

  updateIncidentNote: (
    incidentId: string,
    noteId: string,
    body: JsonObject,
    opts?: IncludeDrillsOpts,
  ) =>
    apiRequest<IncidentNote>(
      withIncludeDrills(`/v1/incidents/${incidentId}/notes/${noteId}`, opts?.includeDrills),
      {
        method: 'PATCH',
        body: JSON.stringify(body),
      },
    ),

  deleteIncidentNote: (incidentId: string, noteId: string, opts?: IncludeDrillsOpts) =>
    apiRequest<{ id: string; deleted: boolean }>(
      withIncludeDrills(`/v1/incidents/${incidentId}/notes/${noteId}`, opts?.includeDrills),
      { method: 'DELETE' },
    ),

  // Tasks
  listIncidentTasks: (incidentId: string, opts?: IncludeDrillsOpts) =>
    apiRequest<IncidentTask[]>(
      withIncludeDrills(`/v1/incidents/${incidentId}/tasks`, opts?.includeDrills),
    ),

  createIncidentTask: (incidentId: string, body: JsonObject, opts?: IncludeDrillsOpts) =>
    apiRequest<IncidentTask>(
      withIncludeDrills(`/v1/incidents/${incidentId}/tasks`, opts?.includeDrills),
      {
        method: 'POST',
        body: JSON.stringify(body),
      },
    ),

  updateIncidentTask: (
    incidentId: string,
    taskId: string,
    body: JsonObject,
    opts?: IncludeDrillsOpts,
  ) =>
    apiRequest<IncidentTask>(
      withIncludeDrills(`/v1/incidents/${incidentId}/tasks/${taskId}`, opts?.includeDrills),
      {
        method: 'PATCH',
        body: JSON.stringify(body),
      },
    ),

  deleteIncidentTask: (incidentId: string, taskId: string, opts?: IncludeDrillsOpts) =>
    apiRequest<{ id: string; deleted: boolean }>(
      withIncludeDrills(`/v1/incidents/${incidentId}/tasks/${taskId}`, opts?.includeDrills),
      { method: 'DELETE' },
    ),

  // SOP completions
  completeSopStep: (incidentId: string, stepId: string, body: JsonObject, opts?: IncludeDrillsOpts) =>
    apiRequest<JsonObject>(
      withIncludeDrills(`/v1/incidents/${incidentId}/sop-completions/${stepId}`, opts?.includeDrills),
      {
        method: 'PUT',
        body: JSON.stringify(body),
      },
    ),

  uncompleteSopStep: (incidentId: string, stepId: string, opts?: IncludeDrillsOpts) =>
    apiRequest<{ stepId: string; deleted: boolean }>(
      withIncludeDrills(`/v1/incidents/${incidentId}/sop-completions/${stepId}`, opts?.includeDrills),
      { method: 'DELETE' },
    ),

  // Commanders
  getIncidentCommanders: (incidentId: string, opts?: IncludeDrillsOpts) =>
    apiRequest<{ assignees: Array<{ name: string | null; email: string | null }> }>(
      withIncludeDrills(`/v1/incidents/${incidentId}/commander`, opts?.includeDrills),
    ),

  getCommanderHistory: (incidentId: string, opts?: IncludeDrillsOpts) =>
    apiRequest<CommanderHistoryEntry[]>(
      withIncludeDrills(`/v1/incidents/${incidentId}/commander/history`, opts?.includeDrills),
    ),

  // Services
  getIncidentServices: (incidentId: string, opts?: IncludeDrillsOpts) =>
    apiRequest<IncidentService[]>(
      withIncludeDrills(`/v1/incidents/${incidentId}/services`, opts?.includeDrills),
    ),

  updateIncidentServices: (incidentId: string, serviceIds: string[], opts?: IncludeDrillsOpts) =>
    apiRequest<IncidentService[]>(
      withIncludeDrills(`/v1/incidents/${incidentId}/services`, opts?.includeDrills),
      {
        method: 'PATCH',
        body: JSON.stringify({ serviceIds }),
      },
    ),

  // Related resources
  listRelatedResources: (incidentId: string, opts?: IncludeDrillsOpts) =>
    apiRequest<RelatedResource[]>(
      withIncludeDrills(`/v1/incidents/${incidentId}/related-resources`, opts?.includeDrills),
    ),

  addRelatedResources: (incidentId: string, resourceIds: string[], opts?: IncludeDrillsOpts) =>
    apiRequest<RelatedResource[]>(
      withIncludeDrills(`/v1/incidents/${incidentId}/related-resources`, opts?.includeDrills),
      {
        method: 'POST',
        body: JSON.stringify({ resourceIds }),
      },
    ),

  deleteRelatedResource: (incidentId: string, resourceId: string, opts?: IncludeDrillsOpts) =>
    apiRequest<{ id: string; deleted: boolean }>(
      withIncludeDrills(
        `/v1/incidents/${incidentId}/related-resources/${resourceId}`,
        opts?.includeDrills,
      ),
      { method: 'DELETE' },
    ),

  addRelatedResourceByUrl: (incidentId: string, url: string, opts?: IncludeDrillsOpts) =>
    apiRequest<RelatedResource>(
      withIncludeDrills(`/v1/incidents/${incidentId}/related-resources/url`, opts?.includeDrills),
      {
        method: 'POST',
        body: JSON.stringify({ url }),
      },
    ),

  // Slack threads
  //
  // addSlackThread is NOT retried on a timeout/network failure: the server links the
  // thread and then ingests its messages from Slack before responding, so a slow
  // ingestion can outlive the client timeout after the link row is already committed.
  // A retry would then surface as a misleading 409 "already linked" instead of the
  // ingestion result — see apiRequest's maxRetries.
  addSlackThread: (incidentId: string, url: string, opts?: IncludeDrillsOpts) =>
    apiRequest<SlackThread>(
      withIncludeDrills(`/v1/incidents/${incidentId}/slack-threads`, opts?.includeDrills),
      { method: 'POST', body: JSON.stringify({ url }) },
      0,
    ),

  deleteSlackThread: (incidentId: string, threadId: string, opts?: IncludeDrillsOpts) =>
    apiRequest<{ id: string; deleted: boolean }>(
      withIncludeDrills(`/v1/incidents/${incidentId}/slack-threads/${threadId}`, opts?.includeDrills),
      { method: 'DELETE' },
    ),

  // Reports
  listReportDrafts: (incidentId: string, draftType?: string, opts?: IncludeDrillsOpts) => {
    const qs = draftType ? `?draftType=${encodeURIComponent(draftType)}` : '';
    return apiRequest<ReportDraft[]>(
      withIncludeDrills(`/v1/incidents/${incidentId}/report-drafts${qs}`, opts?.includeDrills),
    );
  },

  createReportDraft: (incidentId: string, body: JsonObject, opts?: IncludeDrillsOpts) =>
    apiRequest<ReportDraft>(
      withIncludeDrills(`/v1/incidents/${incidentId}/report-drafts`, opts?.includeDrills),
      {
        method: 'POST',
        body: JSON.stringify(body),
      },
    ),

  listPublishedReports: (incidentId: string, reportType?: string, opts?: IncludeDrillsOpts) => {
    const qs = reportType ? `?reportType=${encodeURIComponent(reportType)}` : '';
    return apiRequest<PublishedReport[]>(
      withIncludeDrills(`/v1/incidents/${incidentId}/published-reports${qs}`, opts?.includeDrills),
    );
  },

  // Scheduled workflows
  listScheduledWorkflows: (incidentId: string, opts?: IncludeDrillsOpts) =>
    apiRequest<ScheduledWorkflow[]>(
      withIncludeDrills(`/v1/incidents/${incidentId}/scheduled-workflows`, opts?.includeDrills),
    ),

  createScheduledWorkflow: (incidentId: string, body: JsonObject, opts?: IncludeDrillsOpts) =>
    apiRequest<ScheduledWorkflow>(
      withIncludeDrills(`/v1/incidents/${incidentId}/scheduled-workflows`, opts?.includeDrills),
      {
        method: 'POST',
        body: JSON.stringify(body),
      },
    ),

  cancelScheduledWorkflow: (incidentId: string, workflowId: string, opts?: IncludeDrillsOpts) =>
    apiRequest<{ id: string; status: string }>(
      withIncludeDrills(
        `/v1/incidents/${incidentId}/scheduled-workflows/${workflowId}`,
        opts?.includeDrills,
      ),
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
  getIncidentBlastRadius: (incidentId: string, opts?: IncludeDrillsOpts) =>
    apiRequest<BlastRadius>(
      withIncludeDrills(`/v1/incidents/${incidentId}/blast-radius`, opts?.includeDrills),
    ),

  // Services (CMDB)
  listServices: (params?: URLSearchParams) =>
    apiRequest<Service[]>(`/v1/services${params ? `?${params.toString()}` : ''}`),

  getService: (serviceId: string, includeRetired?: boolean) =>
    apiRequest<Service>(
      `/v1/services/${serviceId}${includeRetired === true ? '?includeRetired=true' : ''}`,
    ),

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

  updateServiceHealth: (serviceId: string, health: string) =>
    apiRequest<{ id: string; operationalHealth: string }>(`/v1/services/${serviceId}/health`, {
      method: 'PATCH',
      body: JSON.stringify({ health }),
    }),

  // Service dependencies (CMDB graph edges)
  listServiceDependencies: (serviceId: string) =>
    apiRequest<ServiceDependency[]>(`/v1/services/${serviceId}/dependencies`),

  listServiceReverseDependencies: (serviceId: string) =>
    apiRequest<ServiceDependency[]>(`/v1/services/${serviceId}/reverse-dependencies`),

  listServiceDependencyEdges: () =>
    apiRequest<ServiceDependency[]>('/v1/service-dependencies'),

  upsertServiceDependency: (body: JsonObject) =>
    apiRequest<ServiceDependency>('/v1/service-dependencies', {
      method: 'POST',
      body: JSON.stringify(body),
    }),

  deleteServiceDependency: (dependencyId: number) =>
    apiRequest<{ id: number; deleted: boolean }>(`/v1/service-dependencies/${dependencyId}`, {
      method: 'DELETE',
    }),

  // CMDB graph batch apply + version history
  //
  // saveCmdbGraphBatch and publishCmdbGraphVersion are NOT retried on a timeout/network
  // failure: each can leave the server having committed (a batch's service.create rows,
  // a new graph version) while the client only sees an ambiguous failure, and retrying
  // would resubmit the same creates/publish rather than a safe no-op. A prompt error
  // response (including 5xx) still isn't retried either way — see apiRequest's maxRetries.
  saveCmdbGraphBatch: (body: JsonObject) =>
    apiRequest<CmdbGraphBatchResult>(
      '/v1/services/graph/batch',
      { method: 'POST', body: JSON.stringify(body) },
      0,
    ),

  getCmdbGraphPendingChanges: () =>
    apiRequest<CmdbGraphPendingChanges>('/v1/services/graph/pending-changes'),

  publishCmdbGraphVersion: (body: JsonObject) =>
    apiRequest<RecordedGraphVersion>(
      '/v1/services/graph/publish',
      { method: 'POST', body: JSON.stringify(body) },
      0,
    ),

  listCmdbGraphVersions: (params?: URLSearchParams) =>
    apiRequest<CmdbGraphVersionHistoryResult>(
      `/v1/services/graph/versions${params ? `?${params.toString()}` : ''}`,
    ),

  getCmdbGraphVersionDetail: (versionNumber: number) =>
    apiRequest<CmdbGraphVersionDetail>(`/v1/services/graph/versions/${versionNumber}`),

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

  // RBAC tags
  listRbacTags: () => apiRequest<RbacTag[]>('/v1/rbac-tags'),

  updateIncidentRbacTags: (incidentId: string, rbacTagIds: string[], opts?: IncludeDrillsOpts) =>
    apiRequest<IncidentDetail>(withIncludeDrills(`/v1/incidents/${incidentId}`, opts?.includeDrills), {
      method: 'PATCH',
      body: JSON.stringify({ rbacTagIds }),
    }),

  // Response Timeline (phase graph + telemetry)
  getIncidentPhaseGraph: (incidentId: string, opts?: IncludeDrillsOpts) =>
    apiRequest<PhaseGraph>(
      withIncludeDrills(`/v1/incidents/${incidentId}/phase-graph`, opts?.includeDrills),
    ),

  createIncidentPhaseNode: (incidentId: string, body: JsonObject, opts?: IncludeDrillsOpts) =>
    apiRequest<PhaseNode>(
      withIncludeDrills(`/v1/incidents/${incidentId}/phase-graph/nodes`, opts?.includeDrills),
      {
        method: 'POST',
        body: JSON.stringify(body),
      },
    ),

  updateIncidentPhaseNode: (
    incidentId: string,
    nodeId: string,
    body: JsonObject,
    opts?: IncludeDrillsOpts,
  ) =>
    apiRequest<PhaseNode>(
      withIncludeDrills(
        `/v1/incidents/${incidentId}/phase-graph/nodes/${nodeId}`,
        opts?.includeDrills,
      ),
      {
        method: 'PATCH',
        body: JSON.stringify(body),
      },
    ),

  deleteIncidentPhaseNode: (incidentId: string, nodeId: string, opts?: IncludeDrillsOpts) =>
    apiRequest<{ success: boolean; isArchived: boolean }>(
      withIncludeDrills(
        `/v1/incidents/${incidentId}/phase-graph/nodes/${nodeId}`,
        opts?.includeDrills,
      ),
      { method: 'DELETE' },
    ),

  createIncidentPhaseEdge: (incidentId: string, body: JsonObject, opts?: IncludeDrillsOpts) =>
    apiRequest<PhaseEdge>(
      withIncludeDrills(`/v1/incidents/${incidentId}/phase-graph/edges`, opts?.includeDrills),
      {
        method: 'POST',
        body: JSON.stringify(body),
      },
    ),

  deleteIncidentPhaseEdge: (incidentId: string, edgeId: string, opts?: IncludeDrillsOpts) =>
    apiRequest<{ success: boolean }>(
      withIncludeDrills(
        `/v1/incidents/${incidentId}/phase-graph/edges/${edgeId}`,
        opts?.includeDrills,
      ),
      { method: 'DELETE' },
    ),

  listIncidentPhaseCaptures: (incidentId: string, opts?: IncludeDrillsOpts) =>
    apiRequest<PhaseCapture[]>(
      withIncludeDrills(`/v1/incidents/${incidentId}/phase-captures`, opts?.includeDrills),
    ),

  createIncidentPhaseCapture: (incidentId: string, body: JsonObject, opts?: IncludeDrillsOpts) =>
    apiRequest<PhaseCapture>(
      withIncludeDrills(`/v1/incidents/${incidentId}/phase-captures`, opts?.includeDrills),
      {
        method: 'POST',
        body: JSON.stringify(body),
      },
    ),

  deleteIncidentPhaseCapture: (incidentId: string, captureId: string, opts?: IncludeDrillsOpts) =>
    apiRequest<{ success: boolean }>(
      withIncludeDrills(
        `/v1/incidents/${incidentId}/phase-captures/${captureId}`,
        opts?.includeDrills,
      ),
      { method: 'DELETE' },
    ),

  getIncidentPhaseTelemetry: (incidentId: string, opts?: IncludeDrillsOpts) =>
    apiRequest<IncidentPhaseTelemetry>(
      withIncludeDrills(`/v1/incidents/${incidentId}/phase-telemetry`, opts?.includeDrills),
    ),

  // Zabbix
  searchZabbixProblems: (query?: string) => {
    const qs = query ? `?q=${encodeURIComponent(query)}` : '';
    return apiRequest<ZabbixProblem[]>(`/v1/integrations/zabbix/problems${qs}`);
  },

  addZabbixRelatedResource: (incidentId: string, body: JsonObject, opts?: IncludeDrillsOpts) =>
    apiRequest<RelatedResource>(
      withIncludeDrills(`/v1/incidents/${incidentId}/related-resources/zabbix`, opts?.includeDrills),
      {
        method: 'POST',
        body: JSON.stringify(body),
      },
    ),

  // Instana
  searchInstanaEvents: (query?: string) => {
    const qs = query ? `?q=${encodeURIComponent(query)}` : '';
    return apiRequest<InstanaEvent[]>(`/v1/integrations/instana/events${qs}`);
  },

  addInstanaRelatedResource: (incidentId: string, body: JsonObject, opts?: IncludeDrillsOpts) =>
    apiRequest<RelatedResource>(
      withIncludeDrills(`/v1/incidents/${incidentId}/related-resources/instana`, opts?.includeDrills),
      {
        method: 'POST',
        body: JSON.stringify(body),
      },
    ),

  searchJiraIssues: (query?: string) => {
    const qs = query ? `?q=${encodeURIComponent(query)}` : '';
    return apiRequest<JiraSearchHit[]>(`/v1/integrations/jira/issues${qs}`);
  },

  searchGitHubIssues: (query?: string) => {
    const qs = query ? `?q=${encodeURIComponent(query)}` : '';
    return apiRequest<GitHubSearchHit[]>(`/v1/integrations/github/issues${qs}`);
  },

  verifyIntegrationConnection: (provider: IntegrationConnectionProvider) =>
    apiRequest<IntegrationConnectionTest>(
      `/v1/integrations/${encodeURIComponent(provider)}/verify-connection`,
      { method: 'POST', body: '{}' },
    ),

  searchNotionPages: (query?: string) => {
    const qs = query ? `?q=${encodeURIComponent(query)}` : '';
    return apiRequest<NotionSearchHit[]>(`/v1/integrations/notion/search${qs}`);
  },

  // Task external-issue linking (Jira / Backlog / ServiceNow)
  linkIncidentTaskExternalIssue: (
    incidentId: string,
    taskId: string,
    body: JsonObject,
    opts?: IncludeDrillsOpts,
  ) =>
    apiRequest<IncidentTask>(
      withIncludeDrills(
        `/v1/incidents/${incidentId}/tasks/${taskId}/external-link`,
        opts?.includeDrills,
      ),
      {
        method: 'POST',
        body: JSON.stringify(body),
      },
    ),

  createIncidentTaskJiraIssue: (
    incidentId: string,
    taskId: string,
    body: JsonObject,
    opts?: IncludeDrillsOpts,
  ) =>
    apiRequest<IncidentTask>(
      withIncludeDrills(
        `/v1/incidents/${incidentId}/tasks/${taskId}/external-link/jira-issue`,
        opts?.includeDrills,
      ),
      { method: 'POST', body: JSON.stringify(body) },
      0,
    ),

  syncIncidentTaskExternalIssue: (incidentId: string, taskId: string, opts?: IncludeDrillsOpts) =>
    apiRequest<IncidentTask>(
      withIncludeDrills(
        `/v1/incidents/${incidentId}/tasks/${taskId}/external-link/sync`,
        opts?.includeDrills,
      ),
      { method: 'POST', body: '{}' },
    ),

  unlinkIncidentTaskExternalIssue: (incidentId: string, taskId: string, opts?: IncludeDrillsOpts) =>
    apiRequest<IncidentTask>(
      withIncludeDrills(
        `/v1/incidents/${incidentId}/tasks/${taskId}/external-link`,
        opts?.includeDrills,
      ),
      { method: 'DELETE' },
    ),

  // Related resources — per-integration structured attach
  addIncidentRelatedResourceByGrafanaItem: (
    incidentId: string,
    body: JsonObject,
    opts?: IncludeDrillsOpts,
  ) =>
    apiRequest<RelatedResource>(
      withIncludeDrills(`/v1/incidents/${incidentId}/related-resources/grafana`, opts?.includeDrills),
      {
        method: 'POST',
        body: JSON.stringify(body),
      },
    ),

  addIncidentRelatedResourceBySentryIssue: (
    incidentId: string,
    body: JsonObject,
    opts?: IncludeDrillsOpts,
  ) =>
    apiRequest<RelatedResource>(
      withIncludeDrills(`/v1/incidents/${incidentId}/related-resources/sentry`, opts?.includeDrills),
      {
        method: 'POST',
        body: JSON.stringify(body),
      },
    ),

  addIncidentRelatedResourceByRollbarItem: (
    incidentId: string,
    body: JsonObject,
    opts?: IncludeDrillsOpts,
  ) =>
    apiRequest<RelatedResource>(
      withIncludeDrills(`/v1/incidents/${incidentId}/related-resources/rollbar`, opts?.includeDrills),
      {
        method: 'POST',
        body: JSON.stringify(body),
      },
    ),

  // Meeting bot sessions
  listIncidentMeetingBots: (incidentId: string, opts?: IncludeDrillsOpts) =>
    apiRequest<MeetingBotSession[]>(
      withIncludeDrills(`/v1/incidents/${incidentId}/meeting-bot`, opts?.includeDrills),
    ),

  // createIncidentMeetingBot is NOT retried: the server dispatches a bot asynchronously
  // and the dispatch is not idempotent — a retry after a timeout can send a second bot.
  createIncidentMeetingBot: (incidentId: string, body: JsonObject, opts?: IncludeDrillsOpts) =>
    apiRequest<MeetingBotSession>(
      withIncludeDrills(`/v1/incidents/${incidentId}/meeting-bot`, opts?.includeDrills),
      { method: 'POST', body: JSON.stringify(body) },
      0,
    ),

  deleteIncidentMeetingBot: (incidentId: string, sessionId: string, opts?: IncludeDrillsOpts) =>
    apiRequest<MeetingBotSession>(
      withIncludeDrills(`/v1/incidents/${incidentId}/meeting-bot/${sessionId}`, opts?.includeDrills),
      { method: 'DELETE' },
    ),

  // Outlook mailbox search
  searchOutlookMail: (query: string, hoursBack?: number, limit?: number) => {
    const qs = new URLSearchParams({ q: query });
    if (hoursBack !== undefined) qs.set('hoursBack', String(hoursBack));
    if (limit !== undefined) qs.set('limit', String(limit));
    return apiRequest<OutlookMailPreview[]>(`/v1/integrations/outlook/mail?${qs.toString()}`);
  },

  getOutlookMail: (id: string) =>
    apiRequest<OutlookMail>(`/v1/integrations/outlook/mail/${id}`),

  // Grafana / Sentry / Rollbar search
  searchGrafanaResources: (query?: string) => {
    const qs = query ? `?q=${encodeURIComponent(query)}` : '';
    return apiRequest<GrafanaResource[]>(`/v1/integrations/grafana/search${qs}`);
  },

  searchSentryIssues: (query?: string) => {
    const qs = query ? `?q=${encodeURIComponent(query)}` : '';
    return apiRequest<SentryIssue[]>(`/v1/integrations/sentry/search${qs}`);
  },

  searchRollbarItems: (query?: string) => {
    const qs = query ? `?q=${encodeURIComponent(query)}` : '';
    return apiRequest<RollbarItem[]>(`/v1/integrations/rollbar/search${qs}`);
  },

  // Drills (BCP / incident exercises). Inserts and state changes are not retried: a timeout
  // after the server has committed would insert a second row, or retry into a 409.
  listDrillIndustries: () => apiRequest<DrillIndustryProfile[]>('/v1/drills/industries'),

  listDrillCatalog: (params?: URLSearchParams) =>
    apiRequest<DrillCatalogEntry[]>(
      `/v1/drills/catalog${params && params.size ? `?${params.toString()}` : ''}`,
    ),

  listDrillScenarios: (params?: URLSearchParams) =>
    apiRequest<DrillScenario[]>(
      `/v1/drills/scenarios${params && params.size ? `?${params.toString()}` : ''}`,
    ),

  createDrillScenario: (body: JsonObject) =>
    apiRequest<DrillScenario>('/v1/drills/scenarios', { method: 'POST', body: JSON.stringify(body) }, 0),

  createDrillScenarioFromCatalog: (body: JsonObject) =>
    apiRequest<DrillScenario>(
      '/v1/drills/scenarios/from-catalog',
      { method: 'POST', body: JSON.stringify(body) },
      0,
    ),

  getDrillScenario: (scenarioId: string) =>
    apiRequest<DrillScenario>(`/v1/drills/scenarios/${scenarioId}`),

  updateDrillScenario: (scenarioId: string, body: JsonObject) =>
    apiRequest<DrillScenario>(`/v1/drills/scenarios/${scenarioId}`, {
      method: 'PATCH',
      body: JSON.stringify(body),
    }),

  deleteDrillScenario: (scenarioId: string) =>
    apiRequest<{ success: boolean }>(`/v1/drills/scenarios/${scenarioId}`, { method: 'DELETE' }),

  listDrillSessions: () => apiRequest<DrillSession[]>('/v1/drills/sessions'),

  createDrillSession: (body: JsonObject) =>
    apiRequest<DrillSession>('/v1/drills/sessions', { method: 'POST', body: JSON.stringify(body) }, 0),

  getDrillSession: (sessionId: string) =>
    apiRequest<DrillSession>(`/v1/drills/sessions/${sessionId}`),

  updateDrillSession: (sessionId: string, body: JsonObject) =>
    apiRequest<DrillSession>(`/v1/drills/sessions/${sessionId}`, {
      method: 'PATCH',
      body: JSON.stringify(body),
    }),

  startDrillSession: (sessionId: string) =>
    apiRequest<DrillSession>(
      `/v1/drills/sessions/${sessionId}/start`,
      { method: 'POST', body: '{}' },
      0,
    ),

  pauseDrillSession: (sessionId: string) =>
    apiRequest<DrillSession>(
      `/v1/drills/sessions/${sessionId}/pause`,
      { method: 'POST', body: '{}' },
      0,
    ),

  resumeDrillSession: (sessionId: string) =>
    apiRequest<DrillSession>(
      `/v1/drills/sessions/${sessionId}/resume`,
      { method: 'POST', body: '{}' },
      0,
    ),

  completeDrillSession: (sessionId: string) =>
    apiRequest<DrillSession>(
      `/v1/drills/sessions/${sessionId}/complete`,
      { method: 'POST', body: '{}' },
      0,
    ),

  listDrillDecisions: (sessionId: string) =>
    apiRequest<DrillDecision[]>(`/v1/drills/sessions/${sessionId}/decisions`),

  createDrillDecision: (sessionId: string, body: JsonObject) =>
    apiRequest<DrillDecisionResult>(
      `/v1/drills/sessions/${sessionId}/decisions`,
      { method: 'POST', body: JSON.stringify(body) },
      0,
      DRILL_LLM_TIMEOUT_MS,
    ),

  deliverDrillInject: (sessionId: string, seq: number) =>
    apiRequest<JsonObject>(
      `/v1/drills/sessions/${sessionId}/injects/${seq}/deliver`,
      { method: 'POST', body: '{}' },
      0,
    ),

  injectDrillWildcard: (sessionId: string, index: number) =>
    apiRequest<JsonObject>(
      `/v1/drills/sessions/${sessionId}/wildcards/${index}/inject`,
      { method: 'POST', body: '{}' },
      0,
    ),

  // Regenerating replaces pending improvements, so a retry after a timeout would run it twice.
  generateDrillDebrief: (sessionId: string) =>
    apiRequest<DrillDebrief>(
      `/v1/drills/sessions/${sessionId}/debrief`,
      { method: 'POST', body: '{}' },
      0,
      DRILL_LLM_TIMEOUT_MS,
    ),

  getDrillDebrief: (sessionId: string) =>
    apiRequest<DrillDebrief | null>(`/v1/drills/sessions/${sessionId}/debrief`),

  acceptDrillImprovement: (improvementId: string) =>
    apiRequest<DrillImprovementItem>(
      `/v1/drills/improvements/${improvementId}/accept`,
      { method: 'POST', body: '{}' },
      0,
    ),

  dismissDrillImprovement: (improvementId: string) =>
    apiRequest<DrillImprovementItem>(
      `/v1/drills/improvements/${improvementId}/dismiss`,
      { method: 'POST', body: '{}' },
      0,
    ),
};

// ---------------------------------------------------------------------------
// Bulk incident export (INTE-160)
//
// The export endpoint returns a binary spreadsheet rather than JSON, so it
// bypasses `apiRequest` (which assumes JSON) and writes the bytes to a local
// file — the idiomatic result for a local stdio MCP server. Exports can be
// large, so it uses a longer timeout than normal requests.
// ---------------------------------------------------------------------------

const EXPORT_TIMEOUT_MS = 120_000;

export interface ExportIncidentsParams {
  format?: 'csv' | 'xlsx';
  encoding?: 'utf8' | 'shiftjis';
  lang?: 'en' | 'ja';
  hasNarrative?: boolean;
  q?: string;
  status?: string[];
  severity?: Array<string | number>;
  declareSource?: string[];
  category?: string[];
  tag?: string[];
  serviceId?: string;
  sortBy?: string;
  sortDir?: 'asc' | 'desc';
  includeDrills?: boolean;
}

function buildExportQuery(params: ExportIncidentsParams): URLSearchParams {
  const qs = new URLSearchParams();
  if (params.format) qs.set('format', params.format);
  if (params.encoding) qs.set('encoding', params.encoding);
  if (params.lang) qs.set('lang', params.lang);
  if (params.hasNarrative) qs.set('hasNarrative', 'true');
  if (params.q) qs.set('q', params.q);
  if (params.serviceId) qs.set('serviceId', params.serviceId);
  if (params.sortBy) qs.set('sortBy', params.sortBy);
  if (params.sortDir) qs.set('sortDir', params.sortDir);
  for (const s of params.status ?? []) qs.append('status', String(s));
  for (const s of params.severity ?? []) qs.append('severity', String(s));
  for (const s of params.declareSource ?? []) qs.append('declareSource', s);
  for (const c of params.category ?? []) qs.append('category', c);
  for (const t of params.tag ?? []) qs.append('tag', t);
  if (params.includeDrills) qs.set('includeDrills', 'true');
  return qs;
}

function resolveOutputPath(outputPath: string): string {
  let p = outputPath;
  if (p === '~' || p.startsWith('~/')) {
    p = p === '~' ? homedir() : resolve(homedir(), p.slice(2));
  }
  return isAbsolute(p) ? p : resolve(process.cwd(), p);
}

/**
 * Directory where the export should be written.
 * - `~/Downloads/` or `~/Downloads` → that directory
 * - `~/Downloads/incidents.xlsx` → `~/Downloads` (file path → parent)
 */
export function resolveExportDirectory(outputPath: string): string {
  const resolved = resolveOutputPath(outputPath);
  if (resolved.endsWith('/') || resolved.endsWith('\\')) {
    return resolved.replace(/[/\\]+$/, '') || resolved;
  }
  const name = basename(resolved);
  // Treat as a file path when it has an extension (e.g. .csv / .xlsx) or looks like a file.
  if (extname(name)) {
    return dirname(resolved);
  }
  return resolved;
}

/** Infer format from a path like `incidents.xlsx` → `xlsx`. Returns null if unknown. */
export function formatFromOutputPath(outputPath: string): 'csv' | 'xlsx' | null {
  const base = outputPath.split(/[\\/]/).pop() ?? outputPath;
  const lower = base.toLowerCase();
  if (lower.endsWith('.xlsx')) return 'xlsx';
  if (lower.endsWith('.csv')) return 'csv';
  return null;
}

/**
 * Resolve the export format so the API payload matches the saved file extension.
 * - If `format` is omitted: infer from extension (default csv when unknown).
 * - If `format` is set and the extension is .csv/.xlsx: require they match.
 */
export function resolveExportFormat(
  outputPath: string,
  format?: 'csv' | 'xlsx',
): 'csv' | 'xlsx' {
  const fromPath = formatFromOutputPath(outputPath);

  if (format === undefined) {
    return fromPath ?? 'csv';
  }

  if (fromPath !== null && fromPath !== format) {
    throw new Error(
      `outputPath extension (.${fromPath}) does not match format="${format}". ` +
        `Use a .${format} path, or omit format to infer from the extension.`,
    );
  }

  return format;
}

async function pathExists(p: string): Promise<boolean> {
  try {
    await access(p, constants.F_OK);
    return true;
  } catch {
    return false;
  }
}

/** `foo.csv` → `foo (1).csv` — mirrors browser download duplicate naming. */
export function withNumericSuffix(filePath: string, n: number): string {
  const dir = dirname(filePath);
  const ext = extname(filePath);
  const base = basename(filePath, ext);
  return join(dir, `${base} (${n})${ext}`);
}

/**
 * Never overwrite: if `desiredPath` exists, try `name (1).ext`, `name (2).ext`, ...
 * Same collision behavior as browser downloads of Twinpower UI exports.
 */
export async function uniqueOutputPath(desiredPath: string): Promise<string> {
  if (!(await pathExists(desiredPath))) return desiredPath;
  for (let n = 1; n < 1000; n++) {
    const candidate = withNumericSuffix(desiredPath, n);
    if (!(await pathExists(candidate))) return candidate;
  }
  throw new Error(`Could not find a free filename near ${desiredPath}`);
}

/**
 * Writes `data` to `desiredPath`, or to `name (1).ext`, `name (2).ext`, ... when taken. Each
 * attempt creates the file exclusively, so concurrent writers never overwrite one another.
 */
export async function writeNewFile(desiredPath: string, data: Buffer): Promise<string> {
  for (let n = 0; n < 1000; n++) {
    const candidate = n === 0 ? desiredPath : withNumericSuffix(desiredPath, n);
    try {
      await writeFile(candidate, data, { flag: 'wx' });
      return candidate;
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== 'EEXIST') throw error;
    }
  }
  throw new Error(`Could not find a free filename near ${desiredPath}`);
}

function sanitizeFilename(name: string): string {
  const sanitised = Array.from(name.trim())
    .filter((ch) => ch.charCodeAt(0) > 31)
    .join('')
    .replace(/[\\/]/g, '_')
    .trim();
  return sanitised || 'incidents.csv';
}

/** Parse `Content-Disposition` the same way the Twinpower UI does. */
export function parseFilenameFromDisposition(
  disposition: string | null,
  fallback: string,
): string {
  if (!disposition) return fallback;

  let name: string | undefined;
  const extended = /filename\*=(?:[^']*'[^']*')?([^;]+)/i.exec(disposition);
  if (extended?.[1]) {
    const raw = extended[1].trim().replace(/^["']|["']$/g, '');
    try {
      name = decodeURIComponent(raw);
    } catch {
      name = raw;
    }
  } else {
    const basic = /filename="?([^";]+)"?/i.exec(disposition);
    name = basic?.[1];
  }
  if (!name) return fallback;
  return sanitizeFilename(name);
}

/** Match backend `buildExportFilename`: `incidents-2026-07-27.csv`. */
export function buildDatedExportFilename(format: 'csv' | 'xlsx', date = new Date()): string {
  return `incidents-${date.toISOString().slice(0, 10)}.${format}`;
}

export async function exportIncidentsToFile(
  params: ExportIncidentsParams,
  outputPath: string,
): Promise<{ path: string; bytes: number; contentType: string; format: 'csv' | 'xlsx' }> {
  const format = resolveExportFormat(outputPath, params.format);
  const { apiUrl, apiToken } = getCredentials();
  const qs = buildExportQuery({ ...params, format });
  const url = `${apiUrl}/v1/incidents/export?${qs.toString()}`;

  const response = await fetchWithTimeout(
    url,
    { method: 'GET', headers: new Headers({ Authorization: `Bearer ${apiToken}` }) },
    EXPORT_TIMEOUT_MS,
  );

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`API error ${response.status} for /v1/incidents/export: ${body}`);
  }

  const contentType = response.headers.get('content-type') ?? 'application/octet-stream';
  const buffer = Buffer.from(await response.arrayBuffer());

  const dir = resolveExportDirectory(outputPath);
  await mkdir(dir, { recursive: true });

  // Prefer the API's dated filename (incidents-YYYY-MM-DD.ext), same as Twinpower UI.
  const fallbackName = buildDatedExportFilename(format);
  const preferredName = parseFilenameFromDisposition(
    response.headers.get('content-disposition'),
    fallbackName,
  );
  // Keep extension aligned with the resolved format even if disposition is odd.
  const baseName = preferredName.replace(/\.(csv|xlsx)$/i, '') + `.${format}`;
  const finalPath = await writeNewFile(join(dir, baseName), buffer);

  return { path: finalPath, bytes: buffer.length, contentType, format };
}

// Generic Public API access for the declarative tools in tools/api.

/** Resolves to `undefined` for an empty response body and to `null` for a JSON `null`. */
export function callPublicApi<T = JsonValue>(
  path: string,
  options: RequestInit = {},
  maxRetries: number = MAX_RETRIES,
  timeoutMs: number = REQUEST_TIMEOUT_MS,
): Promise<T | undefined> {
  return apiRequest<T | undefined>(path, options, maxRetries, timeoutMs, true);
}

const FILE_TRANSFER_TIMEOUT_MS = 120_000;
/** The largest file any upload endpoint accepts (evidence PDFs); the API enforces the per-endpoint limit. */
const MAX_UPLOAD_BYTES = 100 * 1024 * 1024;

function hasHiddenSegment(path: string): boolean {
  return path.split(/[\\/]/).some((segment) => segment.startsWith('.') && segment !== '.' && segment !== '..');
}

/**
 * Rejects local files the model should never send to the tenant even when asked to: anything
 * under a hidden directory or itself hidden (`~/.ssh`, `.env`, `.aws/credentials`), and anything
 * that is not a regular file. Both the requested path and its symlink target are checked, so
 * neither `~/.env -> ~/dotfiles/env` nor `~/env -> ~/.ssh/id_rsa` gets through.
 */
async function assertUploadable(resolved: string): Promise<string> {
  const real = await realpath(resolved);
  if (hasHiddenSegment(resolved) || hasHiddenSegment(real)) {
    throw new Error(`Refusing to upload hidden file or directory content: ${resolved}`);
  }
  const info = await stat(real);
  if (!info.isFile()) throw new Error(`Not a regular file: ${resolved}`);
  if (info.size > MAX_UPLOAD_BYTES) {
    throw new Error(`File is larger than ${MAX_UPLOAD_BYTES / (1024 * 1024)} MB: ${resolved}`);
  }
  return real;
}

/** Uploads local files as multipart/form-data. Never retried: an upload creates a new record. */
export async function uploadFilesToPublicApi(
  path: string,
  method: string,
  fileField: string,
  filePaths: string[],
  fields: Record<string, string>,
): Promise<JsonValue | undefined> {
  const { apiUrl, apiToken } = getCredentials();
  const form = new FormData();
  for (const filePath of filePaths) {
    const resolved = resolveOutputPath(filePath);
    const real = await assertUploadable(resolved);
    form.append(fileField, new Blob([await readFile(real)]), basename(resolved));
  }
  for (const [key, value] of Object.entries(fields)) form.append(key, value);

  const response = await fetchWithTimeout(
    `${apiUrl}${path}`,
    { method, headers: new Headers({ Authorization: `Bearer ${apiToken}` }), body: form },
    FILE_TRANSFER_TIMEOUT_MS,
  );
  const text = await response.text();
  if (!response.ok) throw new Error(`API error ${response.status} for ${path}: ${text}`);
  return text ? unwrapDataPayload<JsonValue>(JSON.parse(text) as JsonValue) : undefined;
}

/** Downloads a file into `outputDirectory`, keeping the server's filename and never overwriting. */
export async function downloadFileFromPublicApi(
  path: string,
  outputDirectory: string,
  fallbackName: string,
): Promise<{ path: string; bytes: number; contentType: string }> {
  const { apiUrl, apiToken } = getCredentials();
  const response = await fetchWithTimeout(
    `${apiUrl}${path}`,
    { method: 'GET', headers: new Headers({ Authorization: `Bearer ${apiToken}` }) },
    FILE_TRANSFER_TIMEOUT_MS,
  );
  if (!response.ok) {
    const body = await response.text();
    throw new Error(`API error ${response.status} for ${path}: ${body}`);
  }
  const contentType = response.headers.get('content-type') ?? 'application/octet-stream';
  const buffer = Buffer.from(await response.arrayBuffer());
  const dir = resolveOutputPath(outputDirectory);
  await mkdir(dir, { recursive: true });
  const served = parseFilenameFromDisposition(response.headers.get('content-disposition'), fallbackName);
  // sanitizeFilename strips separators, but "." or ".." would still point outside the directory.
  const name = served === '.' || served === '..' || served.startsWith('.') ? fallbackName : served;
  const desiredPath = join(dir, name);
  if (dirname(resolve(desiredPath)) !== resolve(dir)) {
    throw new Error(`Refusing to write outside ${dir}: ${desiredPath}`);
  }
  const finalPath = await writeNewFile(desiredPath, buffer);
  return { path: finalPath, bytes: buffer.length, contentType };
}
