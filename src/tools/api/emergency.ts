import { z } from 'zod';
import { optionalNonEmptyStringArraySchema, requiredNonEmptyStringArraySchema } from '../../coerceArrays';
import { AI_TIMEOUT_MS } from './defineApiTool';
import type { ApiToolDefinition } from './defineApiTool';

/** The server allows one model call of up to 240s plus one retry when the output is invalid. */
const EXTRACTION_TIMEOUT_MS = 4 * AI_TIMEOUT_MS;
/** The server allows one model call of up to 90s plus one retry when the output is invalid. */
const CONSULTATION_TIMEOUT_MS = 2 * AI_TIMEOUT_MS;

const HAZARDS = [
  'earthquake',
  'flood',
  'fire',
  'power_outage',
  'network_outage',
  'system_outage',
  'cyber',
  'supply_chain',
  'pandemic',
  'compound',
  'other',
] as const;
const PLAN_STATUSES = ['draft', 'approved', 'archived'] as const;
const CONTACT_STATUSES = ['draft', 'approved'] as const;
const STEP_STATUSES = ['todo', 'in_progress', 'done', 'skipped'] as const;
const ACTIVATION_STATUSES = ['active', 'closed'] as const;
const SOURCE_KINDS = ['evidence', 'master_document'] as const;
const STEP_ID = /^[A-Za-z0-9_-]{1,64}$/;
const MIN_OFFSET_MINUTES = -7 * 24 * 60;
const MAX_OFFSET_MINUTES = 90 * 24 * 60;

const planId = z.string().uuid().describe('Response plan UUID');
const contactId = z.string().uuid().describe('Emergency contact UUID');
const activationId = z.string().uuid().describe('Emergency activation UUID');
const consultationId = z.string().uuid().describe('Emergency consultation UUID');
const language = z.enum(['ja', 'en']).optional().describe('Language of the AI answer (default ja)');
const sourceKind = z
  .enum(SOURCE_KINDS)
  .describe('evidence = evidence library document, master_document = master record file');

const hazards = z
  .array(z.enum(HAZARDS))
  .describe('Kinds of event this applies to; an empty list means any hazard');

const sourceRef = z.object({
  kind: sourceKind,
  documentId: z.string().uuid().describe('Source document UUID'),
  title: z.string().min(1).max(500).describe('Source document title'),
  page: z.number().int().min(1).nullable().describe('Page the content came from, or null'),
});

const offsetMinutes = z.number().int().min(MIN_OFFSET_MINUTES).max(MAX_OFFSET_MINUTES);

const planStep = z.object({
  id: z
    .string()
    .regex(STEP_ID)
    .optional()
    .describe('Stable step id (letters, digits, _ or -). Keep existing ids when editing; assigned when omitted'),
  startOffsetMinutes: offsetMinutes.describe('Minutes from onset when the step starts; negative = before onset'),
  dueOffsetMinutes: offsetMinutes
    .nullable()
    .optional()
    .describe('Minutes from onset when the step is due (not before startOffsetMinutes), or null'),
  title: z.string().min(1).max(255).describe('Step title'),
  detail: z.string().max(4000).nullable().optional().describe('What to do'),
  role: z.string().max(100).nullable().optional().describe('Role in charge within the responder (e.g. HQ chief)'),
  trigger: z.string().max(500).nullable().optional().describe('Condition for running the step'),
  source: sourceRef.nullable().optional().describe('Document the step came from'),
});

const planFields = {
  responderCategory: z.string().max(100).describe('Category of the responder (e.g. department, vendor)'),
  masterRecordId: z.string().uuid().nullable().describe('Master record UUID of the responder, or null'),
  hazards,
  steps: z.array(planStep).max(300).describe('Ordered timeline steps; replaces the whole list'),
};

const contactFields = {
  keywords: z.array(z.string().min(1).max(100)).max(20).describe('Search keywords (max 20)'),
  department: z.string().max(255).nullable().describe('Department within the organization'),
  phone: z.string().max(100).nullable().describe('Phone number'),
  otherContact: z.string().max(1000).nullable().describe('Other contact means (email, URL, radio...)'),
  hours: z.string().max(255).nullable().describe('Hours the contact is reachable'),
  instructions: z.string().max(2000).nullable().describe('What to tell or prepare when contacting'),
  audience: z.string().max(255).describe('Who should use this contact (empty = everyone)'),
  recordId: z
    .string()
    .uuid()
    .nullable()
    .describe('Master record UUID this contact belongs to (e.g. a site), or null for a shared contact'),
  hazards,
  sourceRef: sourceRef.nullable().describe('Document the contact came from'),
};

export const emergencyTools: ApiToolDefinition[] = [
  {
    name: 'list_emergency_plans',
    description:
      'List emergency (BCP) response plans with their step counts, without steps. Filter by status or a text match on title and responder.',
    method: 'GET',
    path: '/v1/emergency/plans',
    input: {
      status: z.enum(PLAN_STATUSES).optional().describe('Only plans with this status'),
      q: z.string().max(200).optional().describe('Text to match in title, responder name or category'),
    },
  },
  {
    name: 'create_emergency_plan',
    description:
      "Create a response plan (a responder's timeline of steps relative to the onset of an event). It starts as a draft; approve it with update_emergency_plan.",
    method: 'POST',
    path: '/v1/emergency/plans',
    input: {
      title: z.string().min(1).max(255).describe('Plan title'),
      responderName: z.string().min(1).max(255).describe('Who carries out the plan (team, site, vendor...)'),
      responderCategory: planFields.responderCategory.optional(),
      masterRecordId: planFields.masterRecordId.optional(),
      hazards: planFields.hazards.optional(),
      steps: planFields.steps.optional(),
    },
  },
  {
    name: 'get_emergency_plan',
    description: 'Get one response plan with all its steps and source documents.',
    method: 'GET',
    path: '/v1/emergency/plans/{planId}',
    input: { planId },
  },
  {
    name: 'update_emergency_plan',
    description:
      'Update a response plan; only sent fields change. Status moves draft <-> approved, either to archived, and archived -> draft only; approving needs at least one step, and an archived plan must be restored to draft before editing.',
    method: 'PATCH',
    path: '/v1/emergency/plans/{planId}',
    input: {
      planId,
      title: z.string().min(1).max(255).optional().describe('Plan title'),
      responderName: z.string().min(1).max(255).optional().describe('Who carries out the plan'),
      responderCategory: planFields.responderCategory.optional(),
      masterRecordId: planFields.masterRecordId.optional(),
      hazards: planFields.hazards.optional(),
      steps: planFields.steps.optional(),
      status: z.enum(PLAN_STATUSES).optional().describe('New status'),
    },
  },
  {
    name: 'delete_emergency_plan',
    description: 'Delete a response plan. Activations already started keep their own copy of it.',
    method: 'DELETE',
    path: '/v1/emergency/plans/{planId}',
    input: { planId },
  },
  {
    name: 'list_emergency_contacts',
    description:
      'List the emergency contact directory (who to call for what). Filter by status, linked master record or a text match.',
    method: 'GET',
    path: '/v1/emergency/contacts',
    input: {
      status: z.enum(CONTACT_STATUSES).optional().describe('Only contacts with this status'),
      q: z
        .string()
        .max(200)
        .optional()
        .describe('Text to match in topic, organization, department, audience or keywords'),
      recordId: z.string().uuid().optional().describe('Only contacts linked to this master record UUID'),
    },
  },
  {
    name: 'create_emergency_contact',
    description:
      'Add an entry to the emergency contact directory. It starts as a draft; only approved contacts are offered in consultations (see approve_emergency_contacts).',
    method: 'POST',
    path: '/v1/emergency/contacts',
    input: {
      topic: z.string().min(1).max(255).describe('What to contact them about (e.g. power outage at HQ)'),
      organization: z.string().min(1).max(255).describe('Organization to contact'),
      keywords: contactFields.keywords.optional(),
      department: contactFields.department.optional(),
      phone: contactFields.phone.optional(),
      otherContact: contactFields.otherContact.optional(),
      hours: contactFields.hours.optional(),
      instructions: contactFields.instructions.optional(),
      audience: contactFields.audience.optional(),
      recordId: contactFields.recordId.optional(),
      hazards: contactFields.hazards.optional(),
      sourceRef: contactFields.sourceRef.optional(),
    },
  },
  {
    name: 'approve_emergency_contacts',
    description:
      'Approve draft emergency contacts in bulk (e.g. after reviewing an extraction). Returns how many changed; non-draft ids are ignored.',
    method: 'POST',
    path: '/v1/emergency/contacts/approve',
    input: {
      contactIds: requiredNonEmptyStringArraySchema.describe('Emergency contact UUIDs to approve (max 1000)'),
    },
  },
  {
    name: 'update_emergency_contact',
    description: 'Update an emergency contact; only sent fields change, null clears a nullable field.',
    method: 'PATCH',
    path: '/v1/emergency/contacts/{contactId}',
    input: {
      contactId,
      topic: z.string().min(1).max(255).optional().describe('What to contact them about'),
      organization: z.string().min(1).max(255).optional().describe('Organization to contact'),
      keywords: contactFields.keywords.optional(),
      department: contactFields.department.optional(),
      phone: contactFields.phone.optional(),
      otherContact: contactFields.otherContact.optional(),
      hours: contactFields.hours.optional(),
      instructions: contactFields.instructions.optional(),
      audience: contactFields.audience.optional(),
      recordId: contactFields.recordId.optional(),
      hazards: contactFields.hazards.optional(),
      sourceRef: contactFields.sourceRef.optional(),
      status: z.enum(CONTACT_STATUSES).optional().describe('New status'),
    },
  },
  {
    name: 'delete_emergency_contact',
    description: 'Delete an emergency contact from the directory.',
    method: 'DELETE',
    path: '/v1/emergency/contacts/{contactId}',
    input: { contactId },
  },
  {
    name: 'extract_emergency_content',
    description:
      'Extract response plans and/or emergency contacts from up to 5 documents (evidence library PDFs or master record files) and save them as drafts to review. Returns the created plans and contacts. Needs read access to the source feature. (AI; consumes credits)',
    method: 'POST',
    path: '/v1/emergency/extractions',
    timeoutMs: EXTRACTION_TIMEOUT_MS,
    input: {
      sources: z
        .array(
          z.object({
            kind: sourceKind,
            documentId: z.string().uuid().describe('Document UUID'),
            fromPage: z.number().int().min(1).optional().describe('First page to read (evidence only)'),
            toPage: z.number().int().min(1).optional().describe('Last page to read (evidence only)'),
          }),
        )
        .min(1)
        .max(5)
        .describe('Documents to read (1-5)'),
      outputs: z
        .object({
          plans: z.boolean().describe('Extract response plans'),
          contacts: z.boolean().describe('Extract emergency contacts'),
        })
        .describe('What to extract; at least one must be true'),
      responder: z
        .object({
          name: z.string().max(255).optional().describe('Responder name'),
          category: z.string().max(100).optional().describe('Responder category'),
          masterRecordId: z.string().uuid().nullable().optional().describe('Responder master record UUID'),
        })
        .nullable()
        .optional()
        .describe("Whose plan this is; for a BCP master document it defaults to the document's record"),
      hazard: z.enum(HAZARDS).nullable().optional().describe('Hazard the plans are for'),
      language: z.enum(['ja', 'en']).optional().describe('Language of the extracted text (default ja)'),
    },
  },
  {
    name: 'list_emergency_activations',
    description: 'List emergency activations (emergency mode runs), active ones first, with step progress counts.',
    method: 'GET',
    path: '/v1/emergency/activations',
    input: {
      status: z.enum(ACTIVATION_STATUSES).optional().describe('Only activations with this status'),
    },
  },
  {
    name: 'start_emergency_activation',
    description:
      'Start emergency mode for an event: copies the given approved plans (or, when planIds is omitted, every approved plan matching the hazard and areas) into a timeline anchored at occurredAt. Returns the activation with its timeline.',
    method: 'POST',
    path: '/v1/emergency/activations',
    input: {
      title: z.string().min(1).max(255).describe('Activation title (e.g. M6 earthquake in Tokyo)'),
      hazard: z.enum(HAZARDS).describe('Kind of event'),
      occurredAt: z
        .string()
        .datetime({ offset: true })
        .describe('Onset time, ISO 8601 with offset (e.g. 2026-11-02T09:00:00+09:00)'),
      areas: optionalNonEmptyStringArraySchema.describe('Affected areas, matched against plan record areas (max 50)'),
      notes: z.string().max(4000).nullable().optional().describe('Free-form notes'),
      incidentId: z.string().uuid().nullable().optional().describe('Related (non-drill) incident UUID'),
      planIds: optionalNonEmptyStringArraySchema.describe(
        'Approved response plan UUIDs to include; omit to select plans automatically',
      ),
    },
  },
  {
    name: 'get_emergency_activation',
    description:
      'Get an emergency activation with its plans and the timeline of steps (wall-clock start/due times and progress per step).',
    method: 'GET',
    path: '/v1/emergency/activations/{activationId}',
    input: { activationId },
  },
  {
    name: 'update_emergency_activation',
    description:
      'Update an active emergency activation (title, areas, notes) or close it with status "closed". A closed activation cannot be changed.',
    method: 'PATCH',
    path: '/v1/emergency/activations/{activationId}',
    input: {
      activationId,
      title: z.string().min(1).max(255).optional().describe('Activation title'),
      areas: optionalNonEmptyStringArraySchema.describe('Affected areas (replaces the list, max 50)'),
      notes: z.string().max(4000).nullable().optional().describe('Free-form notes; null clears'),
      status: z.literal('closed').optional().describe('Set to "closed" to end emergency mode'),
    },
  },
  {
    name: 'update_emergency_activation_step',
    description:
      'Set the status and/or note of one plan step in an active emergency activation. Send at least one of status or note; an omitted status keeps the stored one.',
    method: 'PATCH',
    path: '/v1/emergency/activations/{activationId}/steps',
    input: {
      activationId,
      planId: z.string().uuid().describe('Plan UUID the step belongs to (from the activation timeline)'),
      stepId: z.string().regex(STEP_ID).describe('Step id within the plan (from the activation timeline)'),
      status: z.enum(STEP_STATUSES).optional().describe('New step status'),
      note: z.string().max(2000).nullable().optional().describe('Progress note; null clears'),
    },
  },
  {
    name: 'list_emergency_consultations',
    description: 'List emergency consultations (questions asked during an emergency), most recently updated first.',
    method: 'GET',
    path: '/v1/emergency/consultations',
    input: {
      activationId: z.string().uuid().optional().describe('Only consultations of this activation'),
    },
  },
  {
    name: 'ask_emergency_consultation',
    description:
      'Ask what to do or whom to contact during an emergency. The AI answers from approved emergency contacts with advice and up to 3 matching contacts, and saves the consultation. (AI; consumes credits)',
    method: 'POST',
    path: '/v1/emergency/consultations',
    timeoutMs: CONSULTATION_TIMEOUT_MS,
    input: {
      message: z.string().min(1).max(4000).describe('The question or situation'),
      askerName: z.string().max(255).optional().describe('Who is asking'),
      askerCategory: z.string().max(100).optional().describe("Asker's category (e.g. site, department)"),
      askerRecordId: z
        .string()
        .uuid()
        .nullable()
        .optional()
        .describe("Asker's master record UUID; also offers contacts linked to it"),
      activationId: z.string().uuid().nullable().optional().describe('Emergency activation this is about'),
      language,
    },
  },
  {
    name: 'get_emergency_consultation',
    description: 'Get an emergency consultation with all its messages and AI answers.',
    method: 'GET',
    path: '/v1/emergency/consultations/{consultationId}',
    input: { consultationId },
  },
  {
    name: 'add_emergency_consultation_message',
    description:
      'Send a follow-up message in an emergency consultation and get the next AI answer. (AI; consumes credits)',
    method: 'POST',
    path: '/v1/emergency/consultations/{consultationId}/messages',
    timeoutMs: CONSULTATION_TIMEOUT_MS,
    input: {
      consultationId,
      message: z.string().min(1).max(4000).describe('Follow-up message'),
      language,
    },
  },
];
