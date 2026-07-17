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


export interface Service {
  id: string;
  name: string;
  serviceType?: string | null;
  protectionLevel: number;
  lifecycleState: string;
  tags: string[];
  customerNames: string[];
  sla?: number | null;
  createdAt: string;
  updatedAt: string;
}

export const RISK_CATEGORIES = ['code', 'infrastructure', 'dependency', 'business', 'operational'] as const;
export type RiskCategory = (typeof RISK_CATEGORIES)[number];

export const RISK_SEVERITIES = ['critical', 'high', 'medium', 'low', 'informational'] as const;
export type RiskSeverity = (typeof RISK_SEVERITIES)[number];

export const RISK_STATUSES = ['open', 'acknowledged', 'in_remediation', 'resolved', 'accepted', 'duplicate'] as const;
export type RiskStatus = (typeof RISK_STATUSES)[number];

export interface Risk {
  id: string;
  tenantId: string;
  title: string;
  description?: string | null;
  category?: RiskCategory | null;
  severity?: RiskSeverity | null;
  status: RiskStatus;
  serviceId?: string | null;
  location?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface Integration {
  id: string;
  type: string;
  name?: string | null;
  isConnected: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface BlastRadius {
  incidentId: string;
  services: Service[];
  customerNames: string[];
  totalCustomers: number;
}

export interface RbacTag {
  id: string;
  name: string;
  description: string | null;
  createdAt: string;
  updatedAt: string;
}

/** Response timeline graph node — a response phase (e.g. impact_scope, client_communication, or a custom phase). */
export interface PhaseNode {
  id: string;
  tenantId: string;
  incidentId: string | null;
  label: string;
  description: string | null;
  phaseKey: string | null;
  positionX: number;
  positionY: number;
  sortOrder: number;
  isArchived: boolean;
  createdBy: string | null;
  createdAt: string;
  updatedAt: string;
}

/** Directed edge between two phase graph nodes. */
export interface PhaseEdge {
  id: number;
  tenantId: string;
  incidentId: string | null;
  sourceNodeId: string;
  targetNodeId: string;
  createdAt: string;
}

/** The response timeline graph that applies to an incident (its bound workflow, or the tenant default). */
export interface PhaseGraph {
  isCustom: boolean;
  nodes: PhaseNode[];
  edges: PhaseEdge[];
}

/** A recorded response timeline event — a phase reached at a point in time. */
export interface PhaseCapture {
  id: string;
  tenantId: string;
  incidentId: string;
  nodeId: string;
  capturedAt: string;
  source: 'manual' | 'ai_detect';
  note: string | null;
  createdBy: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface PhaseNodeTelemetry {
  nodeId: string;
  label: string;
  phaseKey: string | null;
  captureCount: number;
  firstCapturedAt: string | null;
  lastCapturedAt: string | null;
}

export interface PhaseEdgeTelemetry {
  sourceNodeId: string;
  targetNodeId: string;
  sourceLabel: string;
  targetLabel: string;
  sourceCapturedAt: string | null;
  targetCapturedAt: string | null;
  elapsedMs: number | null;
}

/** Computed response timeline telemetry for an incident. */
export interface IncidentPhaseTelemetry {
  incidentId: string;
  nodes: PhaseNodeTelemetry[];
  edges: PhaseEdgeTelemetry[];
  captures: PhaseCapture[];
  timeToFirstCustomerCommunicationMs: number | null;
  customerHandlingDurationMs: number | null;
}
