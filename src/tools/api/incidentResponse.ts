import { z } from 'zod';
import { coerceInputToStringArray } from '../../coerceArrays';
import { zIncludeDrills, zRelatedIncidentRef } from '../../incidentZod';
import type { ApiToolDefinition } from './defineApiTool';
import { AI_TIMEOUT_MS } from './defineApiTool';

const incidentId = z.string().uuid().describe('Incident UUID');
const taskId = z.string().uuid().describe('Incident task UUID');
const includeDrills = zIncludeDrills;

const uuidArray = (description: string) =>
  z.preprocess(coerceInputToStringArray, z.array(z.string().uuid())).describe(description);

const SCALAR_FIELD_KEYS = [
  'name',
  'severity',
  'category',
  'subcategory',
  'impact',
  'urgency',
  'services',
  'occurred_at',
  'detected_at',
  'response_started_at',
  'temporary_response_completed_at',
  'permanent_response_completed_at',
] as const;

const fieldKey = z.union([z.enum(SCALAR_FIELD_KEYS), z.string().regex(/^role:.+/)]);
const FIELD_KEY_HELP = `${SCALAR_FIELD_KEYS.join(', ')}, or role:<slotId>`;

const RESOLUTION_CODES = [
  'fixed',
  'workaround',
  'rolled_back',
  'vendor_fix',
  'no_fault_found',
  'duplicate',
  'user_error',
  'other',
] as const;

const itilLevel = z.union([z.literal(1), z.literal(2), z.literal(3)]);

export const incidentResponseTools: ApiToolDefinition[] = [
  {
    name: 'list_incident_field_provenance',
    description:
      'List the incident fields the AI filled and whether a person has verified them. Each field has its key, status (unverified | verified | overridden), source and, when a later note disagrees, a suggestion flagged for review.',
    method: 'GET',
    path: '/v1/incidents/{incidentId}/field-provenance',
    input: { incidentId, includeDrills },
  },
  {
    name: 'verify_incident_fields',
    description:
      'Mark AI-filled incident fields as checked by a person. Omit fieldKeys to verify every AI-filled field. Returns the verified keys and the updated field list.',
    method: 'POST',
    path: '/v1/incidents/{incidentId}/field-provenance/verify',
    query: ['includeDrills'],
    input: {
      incidentId,
      includeDrills,
      fieldKeys: z
        .preprocess(coerceInputToStringArray, z.array(fieldKey).optional())
        .describe(`Field keys to verify (${FIELD_KEY_HELP}); omit for all`),
    },
  },
  {
    name: 'apply_incident_field_suggestion',
    description:
      'Accept the AI suggestion on one incident field flagged for review (a later note disagreed with the AI value), writing the suggested value to the incident. Returns the updated field list.',
    method: 'POST',
    path: '/v1/incidents/{incidentId}/field-provenance/apply-suggestion',
    query: ['includeDrills'],
    input: {
      incidentId,
      includeDrills,
      fieldKey: fieldKey.describe(`Field key with a pending suggestion (${FIELD_KEY_HELP})`),
    },
  },
  {
    name: 'autofill_incident_fields',
    description:
      "Fill an incident's empty fields (name, severity, category, ITIL fields, services, response timestamps, roles) from its notes and chat now, also refreshing earlier AI values nobody has verified. Returns filled, flagged, skippedReason and the fields. (AI; consumes credits)",
    method: 'POST',
    path: '/v1/incidents/{incidentId}/autofill',
    query: ['includeDrills'],
    timeoutMs: AI_TIMEOUT_MS,
    input: {
      incidentId,
      includeDrills,
      timezone: z
        .string()
        .optional()
        .describe('IANA timezone (e.g. Asia/Tokyo) used to read clock times written in notes'),
    },
  },
  {
    name: 'get_itil_options',
    description:
      'Get ITIL classification options: the priority matrix, incident subcategories, resolution codes, knowledge kinds and CI classes. Use before update_incident_itil or close_incident.',
    method: 'GET',
    path: '/v1/itil-options',
  },
  {
    name: 'get_itil_kpis',
    description:
      'Get ITIL KPI aggregates for incidents in a date range, plus change KPIs when the changes feature is available. Non-admins only see incidents they can access.',
    method: 'GET',
    path: '/v1/incidents/analytics/itil-kpis',
    input: {
      startDate: z.string().min(1).describe('Range start (YYYY-MM-DD or ISO 8601)'),
      endDate: z.string().min(1).describe('Range end (YYYY-MM-DD or ISO 8601)'),
    },
  },
  {
    name: 'get_incident_itil',
    description:
      "Get an incident's ITIL fields (impact, urgency, priority, subcategory, major flag, resolution code, root cause, closed time) and its linked risks.",
    method: 'GET',
    path: '/v1/incidents/{incidentId}/itil',
    input: { incidentId, includeDrills },
  },
  {
    name: 'update_incident_itil',
    description:
      "Update an incident's ITIL fields; priority is recomputed from impact and urgency. Setting isMajor true declares a major incident: switches to the major checklist and notifies commanders, admins and routed members.",
    method: 'PATCH',
    path: '/v1/incidents/{incidentId}/itil',
    query: ['includeDrills'],
    input: {
      incidentId,
      includeDrills,
      impact: itilLevel.nullable().optional().describe('Impact 1 (high) to 3 (low); null clears'),
      urgency: itilLevel.nullable().optional().describe('Urgency 1 (high) to 3 (low); null clears'),
      subcategoryId: z
        .string()
        .uuid()
        .nullable()
        .optional()
        .describe("Subcategory UUID from get_itil_options (must match the incident's category); null clears"),
      isMajor: z.boolean().optional().describe('Declare (true) or withdraw (false) a major incident manually'),
      majorAutomatic: z
        .boolean()
        .optional()
        .describe('true hands the major-incident decision back to automatic detection'),
    },
  },
  {
    name: 'close_incident',
    description:
      'Close a resolved incident with a resolution code and root cause summary. Fails unless the incident status is resolved.',
    method: 'POST',
    path: '/v1/incidents/{incidentId}/close',
    query: ['includeDrills'],
    input: {
      incidentId,
      includeDrills,
      resolutionCode: z.enum(RESOLUTION_CODES).describe('How the incident was resolved'),
      rootCauseSummary: z.string().min(1).max(20_000).describe('Root cause summary'),
    },
  },
  {
    name: 'list_incident_changes',
    description:
      'List change records linked to an incident and changes suspected of causing it. Returns { linked, suspected }.',
    method: 'GET',
    path: '/v1/incidents/{incidentId}/changes',
    input: { incidentId, includeDrills },
  },
  {
    name: 'link_incident_change',
    description: 'Link a change record to an incident, as its cause or as related.',
    method: 'POST',
    path: '/v1/incidents/{incidentId}/changes',
    query: ['includeDrills'],
    input: {
      incidentId,
      includeDrills,
      changeId: z.string().uuid().describe('Change UUID'),
      relation: z.enum(['caused', 'related']).optional().describe('Relation to the incident (default related)'),
    },
  },
  {
    name: 'unlink_incident_change',
    description: 'Remove the link between a change record and an incident.',
    method: 'DELETE',
    path: '/v1/incidents/{incidentId}/changes/{changeId}',
    query: ['includeDrills'],
    input: {
      incidentId,
      includeDrills,
      changeId: z.string().uuid().describe('Change UUID'),
    },
  },
  {
    name: 'delete_incident_severity',
    description:
      'Delete one severity row (draft or published) from an incident, e.g. to discard an AI-detected draft. Any pending AI suggestion for the row is rejected.',
    method: 'DELETE',
    path: '/v1/incidents/{incidentId}/severities/{severityId}',
    query: ['includeDrills'],
    input: {
      incidentId,
      includeDrills,
      severityId: z.string().uuid().describe('Severity row UUID from list_incident_severities'),
    },
  },
  {
    name: 'detect_incident_severity',
    description:
      'Infer the incident severity with AI from Slack messages (when available) or incident content. When a level is inferred, creates a draft severity row to publish with publish_incident_severity; returns detected, reason and confidence. (AI; consumes credits)',
    method: 'POST',
    path: '/v1/incidents/{incidentId}/detect-severity',
    query: ['includeDrills'],
    timeoutMs: AI_TIMEOUT_MS,
    input: { incidentId, includeDrills },
  },
  {
    name: 'get_incident_sop_template',
    description:
      'Get the checklist (SOP) template assigned to an incident. templateId is null when the incident uses the default template.',
    method: 'GET',
    path: '/v1/incidents/{incidentId}/sop-template',
    input: { incidentId, includeDrills },
  },
  {
    name: 'set_incident_sop_template',
    description:
      'Assign a checklist (SOP) template to an incident, or pass null to go back to the default template. Anyone who can edit the incident can assign one.',
    method: 'PUT',
    path: '/v1/incidents/{incidentId}/sop-template',
    query: ['includeDrills'],
    input: {
      incidentId,
      includeDrills,
      templateId: z.string().uuid().nullable().describe('SOP template UUID; null clears the assignment'),
    },
  },
  {
    name: 'list_incident_sop_suggestions',
    description:
      'List AI "looks done" suggestions for incomplete checklist steps of an incident, each with stepId, reason and when it was flagged. Confirm one with complete_sop_step or dismiss it.',
    method: 'GET',
    path: '/v1/incidents/{incidentId}/sop-suggestions',
    input: { incidentId, includeDrills },
  },
  {
    name: 'dismiss_incident_sop_suggestion',
    description:
      'Dismiss the AI "looks done" suggestion on one checklist step without completing it; the step is not re-flagged until the cooldown passes.',
    method: 'POST',
    path: '/v1/incidents/{incidentId}/sop-completions/{stepId}/dismiss-suggestion',
    query: ['includeDrills'],
    input: {
      incidentId,
      includeDrills,
      stepId: z.string().uuid().describe('Checklist step UUID'),
    },
  },
  {
    name: 'set_incident_commanders',
    description:
      "Replace an incident's active commanders (also the commander role slot). An empty array clears them. Returns the saved commander IDs. Not allowed for viewer tokens.",
    method: 'PUT',
    path: '/v1/incidents/{incidentId}/commander',
    query: ['includeDrills'],
    input: {
      incidentId,
      includeDrills,
      commanderIds: uuidArray('Tenant member UUIDs to set as commanders; [] clears'),
    },
  },
  {
    name: 'list_incident_risks',
    description: 'List the risks (risk map entries) linked to an incident.',
    method: 'GET',
    path: '/v1/incidents/{incidentId}/risks',
    input: { incidentId, includeDrills },
  },
  {
    name: 'list_incident_role_assignments',
    description:
      "List an incident's role slots (commander and other roles) with their assigned members. Use the slot ids with set_incident_role_slot_members.",
    method: 'GET',
    path: '/v1/incidents/{incidentId}/role-assignments',
    input: { incidentId, includeDrills },
  },
  {
    name: 'add_incident_role_slot',
    description:
      'Add a role slot to an incident from an incident role definition. Returns the new slot. Not allowed for viewer tokens.',
    method: 'POST',
    path: '/v1/incidents/{incidentId}/role-assignments',
    query: ['includeDrills'],
    input: {
      incidentId,
      includeDrills,
      roleDefinitionId: z.string().uuid().describe('Incident role definition UUID'),
    },
  },
  {
    name: 'get_incident_role_assignment_history',
    description:
      'Get the role assignment change history of an incident, newest first, with previous and new members per change.',
    method: 'GET',
    path: '/v1/incidents/{incidentId}/role-assignments/history',
    input: { incidentId, includeDrills },
  },
  {
    name: 'set_incident_role_slot_members',
    description:
      "Replace the members of one incident role slot; an empty array clears it. Returns the updated slot and the incident's role slots. Not allowed for viewer tokens.",
    method: 'PUT',
    path: '/v1/incidents/{incidentId}/role-assignments/{slotId}',
    query: ['includeDrills'],
    input: {
      incidentId,
      includeDrills,
      slotId: z.string().uuid().describe('Role slot UUID from list_incident_role_assignments'),
      memberIds: uuidArray('Tenant member UUIDs for the slot; [] clears'),
    },
  },
  {
    name: 'list_task_external_link_options',
    description:
      'List the issue trackers an incident task can be linked to: whether Jira (with creatable projects), Backlog and ServiceNow are configured.',
    method: 'GET',
    path: '/v1/task-external-link-options',
  },
  {
    name: 'suggest_incident_tasks',
    description:
      'Generate draft task suggestions for an incident from its published summary, timeline and notes, replacing earlier unaccepted generated drafts and reordering existing tasks. Returns suggested false with a reason when there is no published summary or timeline. (AI; consumes credits)',
    method: 'POST',
    path: '/v1/incidents/{incidentId}/tasks/suggest',
    query: ['includeDrills'],
    timeoutMs: AI_TIMEOUT_MS,
    input: {
      incidentId,
      includeDrills,
      stylePreset: z.string().optional().describe('Task configuration preset id that steers task emphasis'),
      customInstructions: z.string().optional().describe('Extra style instructions for the generated tasks'),
      model: z.string().optional().describe('LLM catalog model id (default: the platform default model)'),
    },
  },
  {
    name: 'list_incident_task_reports',
    description: 'List the completion reports submitted for an incident task.',
    method: 'GET',
    path: '/v1/incidents/{incidentId}/tasks/{taskId}/reports',
    input: { incidentId, taskId, includeDrills },
  },
  {
    name: 'submit_incident_task_report',
    description:
      'Submit a completion report for an incident task as the token owner and move the task to in_review. Reviewers are notified; approve or reject it afterwards.',
    method: 'POST',
    path: '/v1/incidents/{incidentId}/tasks/{taskId}/reports',
    query: ['includeDrills'],
    input: {
      incidentId,
      taskId,
      includeDrills,
      report: z.string().min(1).describe('What was done (Markdown)'),
      completedAt: z.string().optional().describe('When the work was completed (ISO 8601; default now)'),
    },
  },
  {
    name: 'list_incident_task_reviews',
    description: 'List the approve/reject reviews recorded on an incident task, with reviewer and comment.',
    method: 'GET',
    path: '/v1/incidents/{incidentId}/tasks/{taskId}/reviews',
    input: { incidentId, taskId, includeDrills },
  },
  {
    name: 'approve_incident_task',
    description:
      "Approve an incident task's report and mark the task done. Tenant admin only. The report author is notified. Returns the updated task.",
    method: 'POST',
    path: '/v1/incidents/{incidentId}/tasks/{taskId}/approve',
    query: ['includeDrills'],
    input: {
      incidentId,
      taskId,
      includeDrills,
      reportId: z.string().uuid().optional().describe('Report UUID to approve (default: the latest report)'),
      comment: z.string().optional().describe('Review comment'),
    },
  },
  {
    name: 'reject_incident_task',
    description:
      "Reject an incident task's report and send the task back to todo. The report author is notified. Returns the updated task.",
    method: 'POST',
    path: '/v1/incidents/{incidentId}/tasks/{taskId}/reject',
    query: ['includeDrills'],
    input: {
      incidentId,
      taskId,
      includeDrills,
      reportId: z.string().uuid().optional().describe('Report UUID to reject (default: the latest report)'),
      comment: z.string().optional().describe('Why the report was rejected'),
    },
  },
  {
    name: 'unapprove_incident_task',
    description:
      'Cancel the approval of a done incident task, moving it back to in_review without recording a review. Returns the updated task.',
    method: 'POST',
    path: '/v1/incidents/{incidentId}/tasks/{taskId}/unapprove',
    query: ['includeDrills'],
    input: { incidentId, taskId, includeDrills },
  },
  {
    name: 'complete_incident_task',
    description:
      'Complete (done) or cancel an incident task directly with a report, skipping review. targetStatus done requires a tenant admin; cancelled does not. Returns the updated task.',
    method: 'POST',
    path: '/v1/incidents/{incidentId}/tasks/{taskId}/complete',
    query: ['includeDrills'],
    input: {
      incidentId,
      taskId,
      includeDrills,
      targetStatus: z.enum(['done', 'cancelled']).describe('Final task status'),
      report: z.string().min(1).describe('What was done, or why the task is cancelled'),
      completedAt: z.string().optional().describe('When the task was finished (ISO 8601; default now)'),
      relatedIncidents: z
        .array(zRelatedIncidentRef)
        .max(100)
        .optional()
        .describe('Related incidents to store on the task (each needs id, status, createdAt)'),
    },
  },
  {
    name: 'suggest_incident_task_assignee',
    description:
      'Suggest assignees for an incident task from who handled similar tasks in similar past incidents. Returns { assignees }.',
    method: 'GET',
    path: '/v1/incidents/{incidentId}/tasks/{taskId}/suggest-assignee',
    input: { incidentId, taskId, includeDrills },
  },
  {
    name: 'suggest_incident_task_due_date',
    description:
      'Suggest a due date for an incident task from similar past incidents; falls back to 24 hours from now (reasonCode DEFAULT_24H) without history.',
    method: 'GET',
    path: '/v1/incidents/{incidentId}/tasks/{taskId}/suggest-due-date',
    input: { incidentId, taskId, includeDrills },
  },
  {
    name: 'link_related_resource_url',
    description:
      'Link a Jira, Notion, Datadog or Google Drive URL to an incident as a related resource (same endpoint as add_related_resource_by_url, as a declarative tool). If the URL is already linked, the existing link is returned.',
    method: 'POST',
    path: '/v1/incidents/{incidentId}/related-resources/url',
    query: ['includeDrills'],
    input: {
      incidentId,
      includeDrills,
      url: z.string().min(1).describe('Jira, Notion, Datadog or Google Drive URL'),
    },
  },
  {
    name: 'get_incident_rbac_tags',
    description: 'Get the RBAC (access control) tags assigned to an incident.',
    method: 'GET',
    path: '/v1/incidents/{incidentId}/rbac-tags',
    input: { incidentId, includeDrills },
  },
  {
    name: 'replace_incident_rbac_tags',
    description:
      "Replace an incident's RBAC tags, which control who can see it; an empty array clears them. Unknown tag ids are rejected and nothing changes. Returns the new tags.",
    method: 'PUT',
    path: '/v1/incidents/{incidentId}/rbac-tags',
    query: ['includeDrills'],
    input: {
      incidentId,
      includeDrills,
      tagIds: uuidArray('RBAC tag UUIDs from list_rbac_tags; [] clears'),
    },
  },
  {
    name: 'list_incident_netbox_targets',
    description:
      'List the NetBox hardware (devices, interfaces and their peers) recorded as affected by an incident, with source and confidence.',
    method: 'GET',
    path: '/v1/incidents/{incidentId}/netbox-targets',
    input: { incidentId, includeDrills },
  },
];
