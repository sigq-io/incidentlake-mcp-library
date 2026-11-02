import { z } from 'zod';
import {
  coerceInputToStringArray,
  optionalNonEmptyStringArraySchema,
  requiredNonEmptyStringArraySchema,
} from '../../coerceArrays';
import type { ApiToolDefinition } from './defineApiTool';

const subcategoryId = z.string().uuid().describe('Incident subcategory UUID');
const definitionId = z.string().uuid().describe('Severity criteria definition UUID');
const sopTemplateId = z.string().uuid().describe('SOP checklist template UUID');
const phaseId = z.string().uuid().describe('SOP checklist phase UUID');
const stepId = z.string().uuid().describe('SOP checklist step UUID');
const roleId = z.string().uuid().describe('Incident role definition UUID');
const actionItemTemplateId = z.string().uuid().describe('Action item template UUID');
const tagId = z.string().uuid().describe('RBAC tag UUID');
const memberId = z.string().uuid().describe('Tenant member UUID');

const priority = z.number().int().min(1).max(5);
const priorityRow = (impact: string) =>
  z
    .object({
      '1': priority.describe(`Priority for impact ${impact}, urgency 1 (high)`),
      '2': priority.describe(`Priority for impact ${impact}, urgency 2 (medium)`),
      '3': priority.describe(`Priority for impact ${impact}, urgency 3 (low)`),
    })
    .describe(`Row for impact ${impact}, keyed by urgency`);

const sopStepPhaseFields = {
  phase: z
    .string()
    .optional()
    .describe('Phase label of the template (must match an existing phase). Required when phaseId is omitted'),
  phaseId: z.string().uuid().optional().describe('Phase UUID of the template. Takes precedence over phase'),
};

const actionItemTemplateData = z
  .array(
    z.object({
      title: z.string().min(1).max(255).describe('Action item title'),
      content: z.string().optional().describe('Action item details'),
      currentStatus: z
        .enum(['draft', 'todo', 'wip', 'done', 'cancelled'])
        .optional()
        .describe('Initial status of the created item (default todo)'),
      sortOrder: z.number().int().optional().describe('Display order (default: position in the array)'),
    }),
  )
  .describe('Action items the template creates, in order');

const rbacRuleFields = {
  tagId: z.string().uuid().describe('RBAC tag UUID (see list_rbac_tags)'),
  resource: z.enum(['incident']).describe('Protected resource type; only incident is supported'),
  ruleType: z.enum(['allow', 'deny']).describe('allow grants write access to tagged incidents, deny limits to read'),
};

const checkpointTimes = z.preprocess(
  coerceInputToStringArray,
  z.array(z.string().regex(/^([01]?\d|2[0-3]):([0-5]\d)$/, 'Expected HH:MM (00:00-23:59)')),
);

export const adminTools: ApiToolDefinition[] = [
  {
    name: 'update_itil_priority_matrix',
    description:
      'Replace the tenant ITIL priority matrix that maps impact × urgency (1 high .. 3 low) to priority 1 (P1) .. 5. All 9 cells are required. Needs write access to workflow settings.',
    method: 'PUT',
    path: '/v1/itil-settings/priority-matrix',
    input: {
      priorityMatrix: z
        .object({ '1': priorityRow('1 (high)'), '2': priorityRow('2 (medium)'), '3': priorityRow('3 (low)') })
        .describe('Matrix keyed by impact then urgency, e.g. {"1":{"1":1,"2":2,"3":3},"2":{...},"3":{...}}'),
    },
  },
  {
    name: 'create_incident_subcategory',
    description:
      'Create an ITIL incident subcategory under a category (system, security, or operational). Returns the created subcategory.',
    method: 'POST',
    path: '/v1/itil-settings/subcategories',
    input: {
      category: z.enum(['system', 'security', 'operational']).describe('Parent incident category'),
      name: z.string().min(1).max(100).describe('Subcategory name (trimmed, max 100 characters)'),
      sortOrder: z.number().int().optional().describe('Display order within the category (default 0)'),
    },
  },
  {
    name: 'update_incident_subcategory',
    description: 'Rename or reorder an ITIL incident subcategory. The category cannot be changed.',
    method: 'PATCH',
    path: '/v1/itil-settings/subcategories/{subcategoryId}',
    input: {
      subcategoryId,
      name: z.string().min(1).max(100).optional().describe('New subcategory name'),
      sortOrder: z.number().int().optional().describe('New display order within the category'),
    },
  },
  {
    name: 'delete_incident_subcategory',
    description: 'Delete an ITIL incident subcategory.',
    method: 'DELETE',
    path: '/v1/itil-settings/subcategories/{subcategoryId}',
    input: { subcategoryId },
  },
  {
    name: 'get_sop_config',
    description:
      'Get the tenant SOP checklist configuration: whether the checklist and its Slack/Teams alerts are enabled, and every template with its phases and steps. Use it to discover template, phase, and step IDs.',
    method: 'GET',
    path: '/v1/sop-config',
  },
  {
    name: 'update_sop_config',
    description:
      'Turn the SOP checklist and/or its Slack and Teams alerts on or off. At least one field is required. Admin only.',
    method: 'PUT',
    path: '/v1/sop-config',
    input: {
      isEnabled: z.boolean().optional().describe('Enable or disable the checklist'),
      alertsEnabled: z.boolean().optional().describe('Enable or disable checklist alerts to Slack and Teams'),
    },
  },
  {
    name: 'list_severity_criteria_definitions',
    description:
      'List the custom name and description per severity level (1-5) that AI severity detection uses, ordered by level.',
    method: 'GET',
    path: '/v1/severity-criteria-definitions',
  },
  {
    name: 'upsert_severity_criteria_definition',
    description:
      'Create the criteria definition for a severity level, or overwrite it when the level already has one (one per level). Admin only.',
    method: 'POST',
    path: '/v1/severity-criteria-definitions',
    input: {
      severityLevel: z.number().int().min(1).max(5).describe('Severity level 1 (most severe) .. 5'),
      name: z.string().min(1).describe('Display name of the level, e.g. "SEV1 - Critical"'),
      description: z.string().optional().describe('Criteria the AI uses to assign this level'),
    },
  },
  {
    name: 'update_severity_criteria_definition',
    description:
      'Update the name and description of a severity criteria definition. Omitting description keeps it; null clears it. Admin only.',
    method: 'PATCH',
    path: '/v1/severity-criteria-definitions/{definitionId}',
    input: {
      definitionId,
      name: z.string().min(1).describe('Display name of the level'),
      description: z.string().nullable().optional().describe('Criteria text; null clears it'),
    },
  },
  {
    name: 'delete_severity_criteria_definition',
    description: 'Delete a severity criteria definition. Admin only.',
    method: 'DELETE',
    path: '/v1/severity-criteria-definitions/{definitionId}',
    input: { definitionId },
  },
  {
    name: 'get_auto_severity_settings',
    description:
      'Get whether delayed AI auto-severity detection is enabled for new incidents and its delay in minutes.',
    method: 'GET',
    path: '/v1/auto-severity-settings',
  },
  {
    name: 'update_auto_severity_settings',
    description:
      'Enable or disable delayed AI auto-severity detection for new incidents and set its delay. Admin only.',
    method: 'PUT',
    path: '/v1/auto-severity-settings',
    input: {
      isEnabled: z.boolean().describe('Enable or disable auto-severity detection'),
      delayMinutes: z
        .union([z.literal(5), z.literal(10), z.literal(15), z.literal(30)])
        .describe('Minutes after incident creation before detection runs: 5, 10, 15, or 30'),
    },
  },
  {
    name: 'create_sop_template',
    description:
      'Create an SOP checklist template with the standard phases and no steps. Returns the template with its phase IDs. Admin only.',
    method: 'POST',
    path: '/v1/sop-templates',
    input: {
      name: z.string().min(1).max(80).describe('Template name (max 80 characters)'),
    },
  },
  {
    name: 'update_sop_template',
    description:
      'Rename an SOP checklist template and/or make it the tenant default (isDefault: true unsets the previous default). Admin only.',
    method: 'PATCH',
    path: '/v1/sop-templates/{templateId}',
    input: {
      templateId: sopTemplateId,
      name: z.string().min(1).max(80).optional().describe('New template name (max 80 characters)'),
      isDefault: z.literal(true).optional().describe('Set true to make this the default template'),
    },
  },
  {
    name: 'delete_sop_template',
    description:
      'Delete an SOP checklist template with its phases and steps. The last template cannot be deleted; incidents using it become unassigned, and if it was the default another template becomes default. Admin only.',
    method: 'DELETE',
    path: '/v1/sop-templates/{templateId}',
    input: { templateId: sopTemplateId },
  },
  {
    name: 'duplicate_sop_template',
    description:
      'Copy an SOP checklist template with its phases and steps as "Copy of <name>" (not default). Returns the new template. Admin only.',
    method: 'POST',
    path: '/v1/sop-templates/{templateId}/duplicate',
    input: { templateId: sopTemplateId },
  },
  {
    name: 'add_sop_phase',
    description:
      'Add a phase at the end of an SOP checklist template. Labels must be unique within the template (case-insensitive). Admin only.',
    method: 'POST',
    path: '/v1/sop-templates/{templateId}/phases',
    input: {
      templateId: sopTemplateId,
      label: z.string().min(1).max(40).describe('Phase label (max 40 characters)'),
    },
  },
  {
    name: 'reorder_sop_phases',
    description:
      'Reorder the phases of an SOP checklist template. Listed phases come first in the given order; unlisted ones keep their relative order after them. Admin only.',
    method: 'PUT',
    path: '/v1/sop-templates/{templateId}/phases/order',
    input: {
      templateId: sopTemplateId,
      phaseIds: requiredNonEmptyStringArraySchema.describe('Phase UUIDs in the new display order'),
    },
  },
  {
    name: 'rename_sop_phase',
    description:
      'Rename a phase of an SOP checklist template. Labels must be unique within the template. Admin only.',
    method: 'PATCH',
    path: '/v1/sop-templates/{templateId}/phases/{phaseId}',
    input: {
      templateId: sopTemplateId,
      phaseId,
      label: z.string().min(1).max(40).describe('New phase label (max 40 characters)'),
    },
  },
  {
    name: 'delete_sop_phase',
    description:
      'Delete a phase from an SOP checklist template. Fails while steps still use the phase or when it is the last phase. Admin only.',
    method: 'DELETE',
    path: '/v1/sop-templates/{templateId}/phases/{phaseId}',
    input: { templateId: sopTemplateId, phaseId },
  },
  {
    name: 'create_sop_step',
    description:
      'Add a step to an SOP checklist template (the default template when templateId is omitted). Give the phase by phaseId or phase label. Admin only.',
    method: 'POST',
    path: '/v1/sop-steps',
    input: {
      title: z.string().min(1).describe('Step title'),
      ...sopStepPhaseFields,
      templateId: z.string().uuid().optional().describe('Template UUID (default: the tenant default template)'),
      sortOrder: z.number().int().min(0).optional().describe('Display order (default 0)'),
    },
  },
  {
    name: 'reorder_sop_steps',
    description:
      'Reorder the steps of an SOP checklist template (default template when templateId is omitted). Listed steps come first in the given order; unlisted ones follow. Admin only.',
    method: 'PUT',
    path: '/v1/sop-steps/order',
    input: {
      templateId: z.string().uuid().optional().describe('Template UUID (default: the tenant default template)'),
      stepIds: requiredNonEmptyStringArraySchema.describe('Step UUIDs in the new display order'),
    },
  },
  {
    name: 'update_sop_step',
    description:
      "Change an SOP checklist step's title and phase (title required; give the phase by phaseId or label). Color and order are kept. Admin only.",
    method: 'PATCH',
    path: '/v1/sop-steps/{stepId}',
    input: {
      stepId,
      title: z.string().min(1).describe('Step title'),
      ...sopStepPhaseFields,
      templateId: z
        .string()
        .uuid()
        .optional()
        .describe('Template containing the step (default: found from the step). Steps cannot move templates'),
    },
  },
  {
    name: 'delete_sop_step',
    description: 'Delete a step from its SOP checklist template. Admin only.',
    method: 'DELETE',
    path: '/v1/sop-steps/{stepId}',
    input: { stepId },
  },
  {
    name: 'set_sop_step_color',
    description: 'Set the highlight color of an SOP checklist step, or pass null to clear it. Admin only.',
    method: 'PATCH',
    path: '/v1/sop-steps/{stepId}/color',
    input: {
      stepId,
      color: z
        .enum(['sky', 'amber', 'violet', 'emerald', 'rose', 'orange'])
        .nullable()
        .describe('Color key, or null to reset to the default'),
    },
  },
  {
    name: 'list_incident_role_definitions',
    description:
      'List the tenant incident role definitions in display order, including whether each is required or enabled. Default roles are created on first use.',
    method: 'GET',
    path: '/v1/incident-role-definitions',
    input: {
      enabledOnly: z.boolean().optional().describe('When true, disabled roles are omitted'),
    },
  },
  {
    name: 'create_incident_role_definition',
    description: 'Create a custom incident role definition, added at the end of the display order. Admin only.',
    method: 'POST',
    path: '/v1/incident-role-definitions',
    input: {
      name: z.string().min(1).max(255).describe('Role name'),
      description: z.string().max(2000).optional().describe('What the role is responsible for'),
      isRequired: z.boolean().optional().describe('Whether incidents should have this role filled (default false)'),
    },
  },
  {
    name: 'reorder_incident_role_definitions',
    description:
      'Set the display order of incident role definitions. The list must contain every role of the tenant exactly once. Returns the roles in the new order. Admin only.',
    method: 'PUT',
    path: '/v1/incident-role-definitions/reorder',
    input: {
      ids: requiredNonEmptyStringArraySchema.describe('All role definition UUIDs in the new display order'),
    },
  },
  {
    name: 'update_incident_role_definition',
    description:
      'Update an incident role definition. Roles cannot be deleted; set isEnabled false to retire one. Admin only.',
    method: 'PATCH',
    path: '/v1/incident-role-definitions/{roleId}',
    input: {
      roleId,
      name: z.string().min(1).max(255).optional().describe('New role name'),
      description: z.string().max(2000).nullable().optional().describe('New description; null clears it'),
      isRequired: z.boolean().optional().describe('Whether incidents should have this role filled'),
      isEnabled: z.boolean().optional().describe('Enable or disable the role'),
    },
  },
  {
    name: 'get_severity_role_routing',
    description:
      'Get which members are auto-assigned to each incident management role per severity level. Admin only.',
    method: 'GET',
    path: '/v1/severity-role-routing',
  },
  {
    name: 'replace_severity_role_routing',
    description:
      'Replace every role-to-member routing assignment for one severity level. Send an empty array to clear the level. Admin only.',
    method: 'PUT',
    path: '/v1/severity-role-routing/{severityLevel}',
    input: {
      severityLevel: z.number().int().min(1).max(5).describe('Severity level 1 .. 5'),
      assignments: z
        .array(
          z.object({
            roleKey: z
              .enum(['dev_lead', 'oncall_engineer', 'product_engineer', 'customer_engineer'])
              .describe('Incident management role'),
            tenantMemberId: z.string().uuid().describe('Active tenant member UUID to assign'),
          }),
        )
        .describe('Assignments for the level; one role may have several members'),
    },
  },
  {
    name: 'get_severity_auto_mention_settings',
    description:
      'Get whether severity auto-mentions are enabled and the Slack/Teams channels they are posted to. Admin only.',
    method: 'GET',
    path: '/v1/severity-auto-mention-settings',
  },
  {
    name: 'update_severity_auto_mention_settings',
    description:
      'Replace the Slack/Teams channel list for severity auto-mentions and optionally toggle the feature. isEnabled is unchanged when omitted. Admin only.',
    method: 'PUT',
    path: '/v1/severity-auto-mention-settings',
    input: {
      isEnabled: z.boolean().optional().describe('Enable or disable auto-mentions'),
      channels: z
        .array(
          z.object({
            channelId: z.string().min(1).describe('Slack or Teams channel ID'),
            teamId: z.string().min(1).describe('Slack workspace (team) ID or Teams team ID'),
            channelName: z.string().optional().describe('Channel display name'),
            platform: z.enum(['slack', 'teams']).optional().describe('Chat platform (default slack)'),
          }),
        )
        .describe('Full channel list (replaces the current one); empty array clears it'),
    },
  },
  {
    name: 'list_action_item_templates',
    description: 'List action item templates: reusable sets of follow-up tasks with their items and tags.',
    method: 'GET',
    path: '/v1/action-item-templates',
  },
  {
    name: 'create_action_item_template',
    description:
      'Create an action item template from a list of items. Tag names that do not exist yet are created. Admin only.',
    method: 'POST',
    path: '/v1/action-item-templates',
    input: {
      name: z.string().min(1).max(255).describe('Template name'),
      description: z.string().optional().describe('Template description'),
      templateData: actionItemTemplateData,
      tags: optionalNonEmptyStringArraySchema.describe('Tag names (max 100 characters each)'),
    },
  },
  {
    name: 'get_action_item_template',
    description: 'Get one action item template with its items and tags.',
    method: 'GET',
    path: '/v1/action-item-templates/{templateId}',
    input: { templateId: actionItemTemplateId },
  },
  {
    name: 'update_action_item_template',
    description:
      'Update an action item template. name and templateData are required and replace the saved values; omitted description, tags, and isActive are kept. Admin only.',
    method: 'PATCH',
    path: '/v1/action-item-templates/{templateId}',
    input: {
      templateId: actionItemTemplateId,
      name: z.string().min(1).max(255).describe('Template name'),
      description: z.string().optional().describe('Template description'),
      templateData: actionItemTemplateData,
      tags: optionalNonEmptyStringArraySchema.describe('Tag names replacing the current ones; empty array clears'),
      isActive: z.boolean().optional().describe('Whether the template is offered for use'),
    },
  },
  {
    name: 'delete_action_item_template',
    description: 'Delete an action item template. Admin only.',
    method: 'DELETE',
    path: '/v1/action-item-templates/{templateId}',
    input: { templateId: actionItemTemplateId },
  },
  {
    name: 'list_action_item_template_tags',
    description: 'List the tags used on action item templates, with their colors.',
    method: 'GET',
    path: '/v1/action-item-template-tags',
  },
  {
    name: 'get_task_ping_settings',
    description:
      'Get the task progress-ping settings: whether recurring chat nudges for open tasks are on and the default interval.',
    method: 'GET',
    path: '/v1/task-ping-settings',
  },
  {
    name: 'update_task_ping_settings',
    description:
      'Enable or disable recurring chat progress pings for open incident tasks and set the default interval. Admin only.',
    method: 'PUT',
    path: '/v1/task-ping-settings',
    input: {
      isEnabled: z.boolean().describe('Enable or disable progress pings'),
      defaultIntervalMinutes: z
        .union([z.literal(10), z.literal(30), z.literal(60)])
        .describe('Default ping interval in minutes: 10, 30, or 60'),
    },
  },
  {
    name: 'get_checkpoint_settings',
    description:
      'Get the scheduled checkpoint settings: whether sync messages are posted to major incident channels, at which times, in which timezone, and the major severity threshold.',
    method: 'GET',
    path: '/v1/checkpoint-settings',
  },
  {
    name: 'update_checkpoint_settings',
    description:
      'Configure scheduled checkpoints: recurring sync messages posted to the chat channel of major incidents (published severity <= threshold) at fixed daily times. Open incidents are rescheduled. Admin only.',
    method: 'PUT',
    path: '/v1/checkpoint-settings',
    input: {
      isEnabled: z.boolean().describe('Enable or disable scheduled checkpoints'),
      times: checkpointTimes.describe('Daily wall-clock times as "HH:MM" (e.g. ["09:00","13:00","17:00"])'),
      timezone: z.string().min(1).describe('IANA timezone for the times, e.g. "Asia/Tokyo"'),
      majorSeverityThreshold: z
        .number()
        .int()
        .min(1)
        .max(5)
        .describe('Incidents with published severity at or below this level (1 = most severe) are major'),
    },
  },
  {
    name: 'create_rbac_tag',
    description:
      'Create an RBAC tag used to restrict incident access (pass its id in rbacTagIds on incidents). Names must be unique. Admin only.',
    method: 'POST',
    path: '/v1/rbac-tags',
    input: {
      name: z.string().min(1).max(255).describe('Tag name (unique per tenant)'),
      description: z.string().nullable().optional().describe('Tag description'),
    },
  },
  {
    name: 'get_rbac_tag',
    description: 'Get one RBAC tag by ID. Admin only.',
    method: 'GET',
    path: '/v1/rbac-tags/{tagId}',
    input: { tagId },
  },
  {
    name: 'update_rbac_tag',
    description: 'Rename an RBAC tag or change its description. Admin only.',
    method: 'PATCH',
    path: '/v1/rbac-tags/{tagId}',
    input: {
      tagId,
      name: z.string().min(1).max(255).optional().describe('New tag name (unique per tenant)'),
      description: z.string().nullable().optional().describe('New description; null or empty clears it'),
    },
  },
  {
    name: 'delete_rbac_tag',
    description: 'Delete an RBAC tag. Incidents lose the tag and access rules that reference it stop applying. Admin only.',
    method: 'DELETE',
    path: '/v1/rbac-tags/{tagId}',
    input: { tagId },
  },
  {
    name: 'list_rbac_management_rules',
    description: 'List all direct member allow/deny rules on incident RBAC tags. Admin only.',
    method: 'GET',
    path: '/v1/rbac-managements',
  },
  {
    name: 'upsert_rbac_management_rule',
    description:
      'Add a direct allow or deny rule for a member on an incident RBAC tag (an identical existing rule is updated). Admin only.',
    method: 'POST',
    path: '/v1/rbac-managements',
    input: {
      tenantMemberId: z.string().uuid().describe('Tenant member UUID the rule applies to'),
      ...rbacRuleFields,
    },
  },
  {
    name: 'list_member_rbac_management_rules',
    description: 'List the direct RBAC allow/deny rules of one member. Admin only.',
    method: 'GET',
    path: '/v1/rbac-managements/member/{memberId}',
    input: { memberId },
  },
  {
    name: 'delete_rbac_management_rule',
    description: 'Delete one direct member RBAC rule. Permission-group rules cannot be deleted here (404). Admin only.',
    method: 'DELETE',
    path: '/v1/rbac-managements/{managementId}',
    input: {
      managementId: z.string().uuid().describe('RBAC management rule UUID'),
    },
  },
  {
    name: 'replace_member_rbac_management_rules',
    description:
      "Replace all of a member's direct RBAC rules with the given list. An empty list clears them. Admin only.",
    method: 'POST',
    path: '/v1/rbac-managements/member/{memberId}/batch',
    input: {
      memberId,
      rules: z.array(z.object(rbacRuleFields)).describe('Complete new rule set for the member'),
    },
  },
];
