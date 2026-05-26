/** JSON-serializable values for request/response typing. */
export type JsonPrimitive = string | number | boolean | null;
export type JsonValue = JsonPrimitive | JsonValue[] | JsonObject;
export type JsonObject = { [key: string]: JsonValue };

/**
 * Incident status values.
 * Accepts exactly this set.
 */
export const INCIDENT_STATUSES = ['ongoing', 'resolved', 'stalled', 'cancelled'] as const;
export type IncidentStatus = (typeof INCIDENT_STATUSES)[number];

/**
 * create body — OpenAPI only documents ongoing | resolved.
 * The handler applies other statuses via update after insert only when non-ongoing.
 */
export const CREATE_INCIDENT_STATUSES = ['ongoing', 'resolved'] as const;
export type IncidentCreateStatus = (typeof CREATE_INCIDENT_STATUSES)[number];

export interface Incident {
  id: string;
  name: string;
  summary?: string;
  status: IncidentStatus;
  severity?: number;
  declareSource?: 'api' | 'slack' | 'manual';
  occurredAt?: string;
  detectedAt?: string;
  resolvedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface PaginatedIncidents {
  incidents: Incident[];
  nextCursor?: string;
  totalCount?: number;
}

export interface IncidentDetail extends Incident {
  timeline?: JsonValue[];
  postmortem?: JsonValue;
  tasks?: JsonValue[];
  notes?: JsonValue[];
  warRooms?: JsonValue[];
  linkedServices?: JsonValue[];
}

export interface SearchResult {
  incidents: Incident[];
  total: number;
}

export interface AnalyticsData {
  startDate: string;
  endDate: string;
  incidents: Incident[];
  summary?: {
    totalIncidents: number;
    bySeverity?: Record<number, number>;
    byStatus?: Record<string, number>;
  };
}

export interface SopCompletion {
  id: string;
  incidentId: string;
  sopId: string;
  stepId: string;
  completed: boolean;
  completedAt?: string;
  completedBy?: string;
}

export interface SopCompletionsData {
  incidentId: string;
  completions: SopCompletion[];
  totalSteps: number;
  completedSteps: number;
}

export interface IncidentNote {
  id: string;
  incidentId: string;
  content: string;
  createdBy: string;
  createdAt: string;
}

/** Active tenant member. */
export interface TenantMember {
  id: string;
  email: string;
  name: string;
  authority: string;
  memberStatus: string;
}

/**
 * Knowledge article.
 */
export interface KnowledgeItem {
  id: string;
  title: string;
  content: string;
  tags?: string[];
  isActive?: boolean;
  currentVersion?: number;
  createdAt: string;
  updatedAt: string;
  tenantId?: string;
  createdBy?: string;
  createdByEmail?: string;
  updatedBy?: string | null;
  reviewRequired?: boolean;
  createdByApiTokenId?: string | null;
}

/** Get Knowledge tags with item counts. */
export interface KnowledgeTagWithCount {
  tag: string;
  count: number;
}

export interface IncidentSeverity {
  id: string;
  incidentId: string;
  tenantId: string;
  severity: number;
  isDraft: boolean;
  reason: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface IncidentSeveritiesData {
  latestDraft: IncidentSeverity | null;
  latestPublished: IncidentSeverity | null;
  all: IncidentSeverity[];
}

export interface IncidentTask {
  id: string;
  incidentId: string;
  tenantId: string;
  title: string;
  content: string | null;
  currentStatus: string;
  assignedTo: string | null;
  dueDate: string | null;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface IncidentService {
  id: string;
  name: string;
  protectionLevel?: string | null;
}

export interface RelatedResource {
  id: string;
  incidentId: string;
  resource: JsonObject;
  createdAt: string;
}

export interface ReportDraft {
  id: string;
  incidentId: string;
  tenantId: string;
  draftType: string;
  content: string;
  title: string | null;
  dataHash: string | null;
  createdByEmail: string;
  createdAt: string;
}

export interface PublishedReport {
  id: string;
  incidentId: string;
  tenantId: string;
  reportType: string;
  content: string;
  title: string | null;
  version: number;
  createdAt: string;
}

export interface ScheduledWorkflow {
  id: string;
  incidentId: string;
  tenantId: string;
  scheduleType: string;
  actionType: string;
  status: string;
  scheduledAt: string;
  repeatIntervalMinutes?: number | null;
  repeatUntil?: string | null;
  createdAt: string;
}

export interface CommanderHistoryEntry {
  tenantMemberId: string;
  assignedAt: string;
  retiredAt: string | null;
  memberName: string | null;
  memberEmail: string | null;
}
