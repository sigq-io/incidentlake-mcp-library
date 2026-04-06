export interface Incident {
  id: string;
  name: string;
  summary?: string;
  status: 'ongoing' | 'resolved' | 'stalled';
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
  timeline?: unknown[];
  postmortem?: unknown;
  tasks?: unknown[];
  notes?: unknown[];
  warRooms?: unknown[];
  linkedServices?: unknown[];
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
