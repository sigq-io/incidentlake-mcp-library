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
  /** Slack threads linked manually (Communication tab or add_slack_thread). */
  slackThreadUrls?: IncidentSlackThreadUrl[];
}

export interface IncidentSlackThreadUrl {
  id: string;
  url: string;
  channelName: string | null;
  createdAt: string;
  threadMessages?: JsonValue[];
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

/** Tenant the presented API token is bound to (GET /v1/me). */
export interface CurrentTenant {
  id: string;
  name: string;
  defaultLanguage: string | null;
  createdAt: string;
  updatedAt: string;
}

/**
 * AI-generated knowledge draft awaiting review.
 * Not returned by GET /v1/knowledge until approved.
 */
export interface PendingKnowledgeDraft {
  id: string;
  tenantId: string;
  createdBy: string;
  createdByEmail: string | null;
  title: string;
  content: string;
  tags: string[];
  isActive: boolean;
  reviewStatus: string;
  source: string;
  sourceReportId: string | null;
  sourceIncidentId: string | null;
  currentVersion: number;
  updatedBy: string | null;
  createdAt: string;
  updatedAt: string;
}

/** Approved AI knowledge draft (POST /v1/knowledge/{id}/approve). */
export type ApprovedKnowledgeDraft = Omit<PendingKnowledgeDraft, 'createdByEmail'>;

/** Jira issue hit from GET /v1/integrations/jira/issues. */
export interface JiraSearchHit {
  issueKey: string;
  summary: string;
  statusName?: string;
  issueTypeName?: string;
  priorityName?: string;
  updatedAt?: string;
  url: string;
}

/** Notion page hit from GET /v1/integrations/notion/search. */
export interface NotionSearchHit {
  title: string;
  url: string;
  lastEditedAt: string | null;
  objectType: 'page' | 'database';
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

export interface SlackThread {
  id: string;
  url: string;
  channelName: string | null;
  createdAt: string;
  /** Set when the Slack bot could not read the thread (e.g. 'not_in_channel'); the link is still created. */
  accessWarning: string | null;
  /** Number of messages ingested, or null when ingestion was skipped. */
  ingestedMessageCount: number | null;
}

export type ZabbixSeverityLabel =
  | 'Not classified'
  | 'Information'
  | 'Warning'
  | 'Average'
  | 'High'
  | 'Disaster';

export interface ZabbixProblem {
  eventId: string;
  triggerId: string;
  name: string;
  /** Zabbix's raw 0-5 severity (0=Not classified ... 5=Disaster). */
  severity: number;
  severityLabel: ZabbixSeverityLabel;
  occurredAt: string;
  acknowledged: boolean;
  hostId?: string;
  hostName?: string;
  tags: { tag: string; value?: string }[];
}

export type InstanaSeverityLabel = 'Change' | 'Warning' | 'Critical';

export interface InstanaEvent {
  eventId: string;
  name: string;
  /** Instana's raw severity (-1/absent=Change, 5=Warning, 10=Critical). */
  severity: number;
  severityLabel: InstanaSeverityLabel;
  occurredAt: string;
  entityId?: string;
  entityName?: string;
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
  description?: string | null;
  lifecycleState: string;
  operationalHealth?: string | null;
  tags: string[];
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

/** A directed CMDB graph edge: parentServiceId depends on childServiceId. */
export interface ServiceDependency {
  id: number;
  tenantId: string;
  parentServiceId: string;
  childServiceId: string | null;
  childServiceName: string | null;
  dependencyType: string | null;
  confidenceScore: number | null;
  evidenceSnippet: string | null;
  sourceUrl: string | null;
  lastDetected: string;
  createdAt: string;
  updatedAt: string;
}

/** Result of POST /v1/services/graph/batch — maps each services.create tempId to its real id. */
export interface CmdbGraphBatchResult {
  createdServiceIds: Record<string, string>;
}

export interface CmdbGraphChangeSummary {
  nodesAdded: JsonValue[];
  nodesRemoved: JsonValue[];
  nodesModified: JsonValue[];
  edgesAdded: JsonValue[];
  edgesRemoved: JsonValue[];
  edgesModified: JsonValue[];
}

export interface CmdbGraphPendingChanges {
  changeSummary: CmdbGraphChangeSummary;
  hasChanges: boolean;
}

export interface RecordedGraphVersion {
  id: string;
  versionNumber: number;
  name: string | null;
  changeSummary: CmdbGraphChangeSummary;
}

export interface CmdbGraphChangeSummaryCounts {
  nodesAdded: number;
  nodesRemoved: number;
  nodesModified: number;
  edgesAdded: number;
  edgesRemoved: number;
  edgesModified: number;
}

export interface CmdbGraphVersionHistoryEntry {
  id: string;
  versionNumber: number;
  name: string | null;
  createdAt: string;
  createdBy: string | null;
  createdByName: string | null;
  createdByEmail: string | null;
  createdByLabel: string | null;
  changeSummaryCounts: CmdbGraphChangeSummaryCounts;
  isCurrent: boolean;
}

export interface CmdbGraphVersionHistoryResult {
  versions: CmdbGraphVersionHistoryEntry[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  currentVersionNumber: number;
}

export interface CmdbGraphVersionDetail {
  id: string;
  versionNumber: number;
  name: string | null;
  createdAt: string;
  createdBy: string | null;
  createdByName: string | null;
  createdByEmail: string | null;
  createdByLabel: string | null;
  snapshot: JsonObject;
  changeSummary: CmdbGraphChangeSummary;
  isCurrent: boolean;
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
