import { z } from 'zod';
import type { ApiToolDefinition } from './defineApiTool';

const ruleId = z.string().uuid().describe('Workflow automation rule UUID');
const slackId = z.string().regex(/^[A-Z0-9]{1,50}$/i);
const template = (max: number, what: string) =>
  z
    .string()
    .max(max)
    .optional()
    .describe(
      `${what} template; empty uses the default. Placeholders: {{rule_name}}, {{incident_name}}, {{incident_url}}, {{status}}, {{severity}}, {{event}}`,
    );

const action = z.discriminatedUnion('type', [
  z.object({
    type: z.literal('slack_message'),
    channelId: slackId.describe('Slack channel ID'),
    teamId: slackId.describe('Slack workspace (team) ID; the workspace must be connected'),
    channelName: z.string().max(200).optional().describe('Channel name, for display'),
    message: template(3000, 'Message'),
  }),
  z.object({
    type: z.literal('email'),
    to: z
      .array(z.string().email())
      .min(1)
      .max(10)
      .describe('Addresses or mailing lists (max 10); each gets its own message'),
    subject: template(200, 'Single-line subject'),
    body: template(5000, 'Body'),
  }),
  z.object({
    type: z.literal('oncall_page'),
    scheduleId: z.string().uuid().describe('On-call schedule UUID to page by phone (needs the on-call add-on)'),
  }),
]);

const ruleInput = {
  name: z.string().min(1).max(200).describe('Rule name'),
  isEnabled: z.boolean().optional().describe('Default true'),
  triggerType: z
    .enum(['incident_created', 'incident_status_changed', 'incident_severity_changed'])
    .describe('Event that runs the rule'),
  conditions: z
    .object({
      toStatus: z
        .enum(['ongoing', 'stalled', 'resolved', 'cancelled', 'false_positive'])
        .nullable()
        .optional()
        .describe('incident_status_changed only: run only when the incident moves to this status; null = any change'),
      severityAtOrAbove: z
        .number()
        .int()
        .min(1)
        .max(5)
        .nullable()
        .optional()
        .describe('incident_severity_changed only: run only when severity reaches this level or worse (1 is the most severe); null = any change'),
    })
    .optional()
    .describe('Only the condition matching triggerType is kept'),
  actions: z.array(action).min(1).max(5).describe('Actions run in order (max 5); a failing action does not stop the next'),
};

export const workflowTools: ApiToolDefinition[] = [
  {
    name: 'list_workflow_automations',
    description: 'List workflow automation rules ("when <trigger> (and <conditions>), do <actions>") with their last run.',
    method: 'GET',
    path: '/v1/workflow-automations',
  },
  {
    name: 'create_workflow_automation',
    description:
      'Create a workflow automation rule that posts to Slack, sends email or pages on-call when an incident is created or its status or severity changes. Drill and merged incidents never trigger rules. Admin only; at most 50 rules per tenant.',
    method: 'POST',
    path: '/v1/workflow-automations',
    input: ruleInput,
  },
  {
    name: 'update_workflow_automation',
    description: 'Replace a workflow automation rule (send the whole rule, as for create). Admin only.',
    method: 'PUT',
    path: '/v1/workflow-automations/{ruleId}',
    input: { ruleId, ...ruleInput },
  },
  {
    name: 'delete_workflow_automation',
    description: 'Delete a workflow automation rule. Admin only.',
    method: 'DELETE',
    path: '/v1/workflow-automations/{ruleId}',
    input: { ruleId },
  },
  {
    name: 'list_workflow_automation_runs',
    description:
      'List recent workflow automation runs with the result of each action. Runs on incidents the caller cannot read are left out.',
    method: 'GET',
    path: '/v1/workflow-automation-runs',
    input: { ruleId: ruleId.optional().describe('Only runs of this rule') },
  },
];
