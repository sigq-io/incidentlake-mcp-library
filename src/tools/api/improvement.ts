import { z } from 'zod';
import { requiredNonEmptyStringArraySchema } from '../../coerceArrays';
import type { ApiToolDefinition } from './defineApiTool';
import { AI_TIMEOUT_MS } from './defineApiTool';

const riskId = z.string().uuid().describe('Risk UUID');
const taskId = z.string().uuid().describe('Improvement task UUID');

const TASK_KINDS = [
  'knowledge_update',
  'knowledge_create',
  'knowledge_review',
  'process_improvement',
  'manual',
] as const;
const TASK_PRIORITIES = ['high', 'medium', 'low'] as const;
const dueDate = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/)
  .describe('Due date (YYYY-MM-DD)');

export const improvementTools: ApiToolDefinition[] = [
  {
    name: 'list_risk_candidates',
    description:
      'Find candidate problems: groups of recent recurring incidents that are not yet linked to any risk. Use it to spot patterns worth registering as a risk.',
    method: 'GET',
    path: '/v1/risk-candidates',
    input: {
      days: z.number().int().min(1).max(365).optional().describe('Lookback window in days (default 90)'),
      minIncidents: z
        .number()
        .int()
        .min(2)
        .max(20)
        .optional()
        .describe('Minimum incidents for a group to count as a candidate (default 2)'),
    },
  },
  {
    name: 'suggest_risks_from_incidents',
    description:
      'Analyse resolved incidents and return suggested risks (title, category, severity, rationale). Nothing is saved; create one with create_risk. (AI; consumes credits)',
    method: 'POST',
    path: '/v1/risks/suggest-from-incidents',
    input: {
      language: z.string().optional().describe('Language for the generated text, e.g. `en` or `ja`'),
    },
    query: ['language'],
    timeoutMs: AI_TIMEOUT_MS,
  },
  {
    name: 'delete_risk',
    description: 'Permanently delete a risk. Knowledge items linked to it are kept but unlinked.',
    method: 'DELETE',
    path: '/v1/risks/{riskId}',
    input: { riskId },
  },
  {
    name: 'get_risk_history',
    description: 'Get the audit trail of changes made to a risk.',
    method: 'GET',
    path: '/v1/risks/{riskId}/history',
    input: { riskId },
  },
  {
    name: 'get_risk_related_records',
    description:
      'Get the incidents, corrective-action tasks and known-error knowledge items linked to a risk. Incidents the caller cannot see are counted in `hiddenIncidentCount`.',
    method: 'GET',
    path: '/v1/risks/{riskId}/related',
    input: { riskId },
  },
  {
    name: 'link_service_to_risk',
    description: 'Add a CMDB service to the affected services of a risk. Returns the updated risk.',
    method: 'POST',
    path: '/v1/risks/{riskId}/link-service/{serviceId}',
    input: {
      riskId,
      serviceId: z.string().uuid().describe('CMDB service UUID'),
    },
    retries: 2,
  },
  {
    name: 'link_incidents_to_risk',
    description:
      'Link several incidents to a risk at once. Incidents the caller cannot see are skipped; returns `linked`, the number of new links.',
    method: 'POST',
    path: '/v1/risks/{riskId}/incidents',
    input: {
      riskId,
      incidentIds: requiredNonEmptyStringArraySchema.describe('Incident UUIDs to link'),
    },
    retries: 2,
  },
  {
    name: 'unlink_incident_from_risk',
    description: 'Remove the link between an incident and a risk.',
    method: 'DELETE',
    path: '/v1/risks/{riskId}/incidents/{incidentId}',
    input: {
      riskId,
      incidentId: z.string().uuid().describe('Incident UUID'),
    },
  },
  {
    name: 'create_risk_corrective_task',
    description:
      'Create a corrective-action (process improvement) task linked to a risk. Priority defaults to medium.',
    method: 'POST',
    path: '/v1/risks/{riskId}/tasks',
    input: {
      riskId,
      title: z.string().min(1).describe('Task title'),
      description: z.string().optional().describe('Task details'),
      priority: z.enum(TASK_PRIORITIES).optional().describe('Priority (default medium)'),
      assignedTo: z.string().uuid().optional().describe('Tenant member UUID to assign'),
      dueDate: dueDate.optional(),
    },
  },
  {
    name: 'draft_risk_known_error',
    description:
      'Generate a draft known-error knowledge item from a risk and its linked incidents; replaces an earlier pending draft and opens a review task. The risk must have a root cause recorded, otherwise fails with ROOT_CAUSE_REQUIRED. Returns `knowledgeId`. (AI; consumes credits)',
    method: 'POST',
    destructive: true,
    path: '/v1/risks/{riskId}/known-error-draft',
    input: { riskId },
    timeoutMs: AI_TIMEOUT_MS,
  },
  {
    name: 'list_improvement_tasks',
    description:
      'List improvement tasks (knowledge updates, reviews, process improvements), optionally filtered by status, kind, priority or assignee.',
    method: 'GET',
    path: '/v1/improvement-tasks',
    input: {
      status: z
        .enum(['suggested', 'done', 'dismissed', 'adopted'])
        .optional()
        .describe('Status filter; adopted means the task was turned into a task board task'),
      kind: z.enum(TASK_KINDS).optional().describe('Kind filter'),
      priority: z.enum(TASK_PRIORITIES).optional().describe('Priority filter'),
      assignedTo: z.string().uuid().optional().describe('Only tasks assigned to this tenant member UUID'),
    },
  },
  {
    name: 'get_improvement_task_summary',
    description: 'Get improvement task counts: suggested, done, dismissed, overdue and total active.',
    method: 'GET',
    path: '/v1/improvement-tasks/summary',
  },
  {
    name: 'scan_improvement_tasks',
    description:
      'Scan for stale knowledge, resolved incidents without articles and pending knowledge drafts, and create suggested improvement tasks. Returns created/skipped counts; `hasMore` means run it again. Can take several minutes. Not available to viewers. (AI; consumes credits)',
    method: 'POST',
    path: '/v1/improvement-tasks/scan',
    timeoutMs: 5 * AI_TIMEOUT_MS,
  },
  {
    name: 'get_improvement_task',
    description: 'Get one improvement task by ID.',
    method: 'GET',
    path: '/v1/improvement-tasks/{taskId}',
    input: { taskId },
  },
  {
    name: 'update_improvement_task',
    description:
      'Update an improvement task: close it (done/dismissed), reopen it (suggested), or change its fields. Tasks adopted to the task board cannot change status here. Not available to viewers.',
    method: 'PATCH',
    path: '/v1/improvement-tasks/{taskId}',
    input: {
      taskId,
      title: z.string().min(1).optional().describe('New title'),
      description: z.string().nullable().optional().describe('New description (null clears)'),
      suggestedAction: z.string().nullable().optional().describe('Suggested action text (null clears)'),
      kind: z.enum(TASK_KINDS).optional().describe('Task kind'),
      status: z
        .enum(['suggested', 'done', 'dismissed'])
        .optional()
        .describe('New status; suggested can move to done or dismissed, and those back to suggested'),
      priority: z.enum(TASK_PRIORITIES).optional().describe('Priority'),
      knowledgeItemId: z.string().uuid().nullable().optional().describe('Linked knowledge item UUID (null clears)'),
      incidentId: z.string().uuid().nullable().optional().describe('Linked incident UUID (null clears)'),
      assignedTo: z.string().uuid().nullable().optional().describe('Assignee tenant member UUID (null clears)'),
      dueDate: dueDate.nullable().optional().describe('Due date YYYY-MM-DD (null clears)'),
      reviewNote: z.string().nullable().optional().describe('Review note, e.g. why it was closed (null clears)'),
    },
  },
  {
    name: 'delete_improvement_task',
    description: 'Permanently delete an improvement task. Not available to viewers.',
    method: 'DELETE',
    path: '/v1/improvement-tasks/{taskId}',
    input: { taskId },
  },
];
