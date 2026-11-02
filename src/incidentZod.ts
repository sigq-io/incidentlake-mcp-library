import { z } from 'zod';
import {
  CREATE_INCIDENT_STATUSES,
  INCIDENT_ACTIVITY_TYPES,
  INCIDENT_CATEGORIES,
  INCIDENT_STATUSES,
} from './types';

/** PATCH /v1/incidents/:id — matches Public API `validStatuses`. */
export const zIncidentStatusPatch = z.enum(INCIDENT_STATUSES);

/** GET /v1/incidents list filter — same values the DB stores (filter uses equality). */
export const zIncidentStatusListFilter = z.enum(INCIDENT_STATUSES);

/** POST /v1/incidents — OpenAPI create body enum. */
export const zIncidentStatusCreate = z.enum(CREATE_INCIDENT_STATUSES);

/** Drill (exercise) incidents stay hidden unless this is true. Matches `?includeDrills=true`. */
export const zIncludeDrills = z
  .boolean()
  .optional()
  .describe(
    'Set true to read or change a drill (exercise) incident. Omit to keep the default: drill incidents are hidden and return 404.',
  );

export const zIncidentCategory = z.enum(INCIDENT_CATEGORIES);

export const zOptionalNullableIncidentCategory = zIncidentCategory
  .nullable()
  .optional()
  .describe('Incident category (system, security, operational). Null clears it.');

export const zActivityType = z
  .enum(INCIDENT_ACTIVITY_TYPES)
  .nullable()
  .optional()
  .describe(
    `Response activity this task tracks. Null clears it. Options: ${INCIDENT_ACTIVITY_TYPES.join(', ')}`,
  );

const RELATED_INCIDENT_STATUSES = [
  'ongoing',
  'resolved',
  'stalled',
  'cancelled',
  'false_positive',
  'merged',
] as const;

export const zRelatedIncidentRef = z.object({
  id: z.string().uuid(),
  name: z.string().max(2000).nullable().optional(),
  severity: z.number().finite().nullable().optional(),
  status: z.enum(RELATED_INCIDENT_STATUSES),
  createdAt: z.string().min(1).max(64),
  resolutionSummary: z.string().max(50000).nullable().optional(),
  similarity: z.number().finite().optional(),
});

export const zRelatedIncidents = z
  .array(zRelatedIncidentRef)
  .max(100)
  .nullable()
  .optional()
  .describe(
    'Related incidents stored on the task. Each item needs id, status, and createdAt. Null or [] on update clears the list.',
  );

/** Task statuses — matches Public API `VALID_TASK_STATUSES`. */
export const TASK_STATUSES = ['draft', 'todo', 'wip', 'in_review', 'done', 'cancelled'] as const;
export type TaskStatus = (typeof TASK_STATUSES)[number];
export const zTaskStatus = z.enum(TASK_STATUSES);
