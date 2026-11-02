import { McpServer } from "@modelcontextprotocol/server";
import { z } from 'zod';
import { api } from '../client';
import { zIncludeDrills } from '../incidentZod';
import type { JsonObject } from '../types';

const VALID_ACTION_TYPES = [
  'post_summary',
  'post_timeline',
  'post_postmortem',
  'update_summary',
  'update_timeline',
  'update_postmortem',
] as const;

const inputObject = z.object({
    incidentId: z.string().uuid().describe('The UUID of the incident'),
    includeDrills: zIncludeDrills,
    scheduleType: z
      .enum(['delay', 'specific_time', 'recurring'])
      .describe(
        'How to schedule: delay (minutes from now), specific_time (exact datetime), or recurring (repeat on interval)',
      ),
    actionType: z
      .enum(VALID_ACTION_TYPES)
      .describe(`Action to perform. Options: ${VALID_ACTION_TYPES.join(', ')}`),
    delayMinutes: z
      .number()
      .min(0)
      .optional()
      .describe('Minutes from now (required when scheduleType is "delay")'),
    scheduledAt: z
      .string()
      .datetime()
      .optional()
      .describe('ISO 8601 future datetime (required when scheduleType is "specific_time")'),
    repeatIntervalMinutes: z
      .number()
      .min(1)
      .optional()
      .describe('Repeat interval in minutes, minimum 1 (required when scheduleType is "recurring")'),
    repeatUntil: z
      .string()
      .datetime()
      .optional()
      .describe('ISO 8601 end datetime within 2 days (required when scheduleType is "recurring")'),
    targetSlackChannelId: z
      .string()
      .optional()
      .describe('Slack channel ID (required for post_* actions)'),
    targetSlackTeamId: z
      .string()
      .optional()
      .describe('Slack team ID (required for post_* actions)'),
    targetThreadTs: z
      .string()
      .optional()
      .describe('Optional Slack thread timestamp for post_* actions'),
    targetChannelName: z
      .string()
      .optional()
      .describe('Optional Slack channel name for post_* actions'),
    timezone: z
      .string()
      .optional()
      .describe('Optional IANA timezone string (e.g. "America/New_York")'),
});

const inputSchema = inputObject.superRefine((val, ctx) => {
    if (val.scheduleType === 'delay' && val.delayMinutes === undefined) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['delayMinutes'],
        message: 'delayMinutes is required when scheduleType is "delay"',
      });
    }
    if (val.scheduleType === 'specific_time' && val.scheduledAt === undefined) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['scheduledAt'],
        message: 'scheduledAt is required when scheduleType is "specific_time"',
      });
    }
    if (val.scheduleType === 'recurring') {
      if (val.repeatIntervalMinutes === undefined) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['repeatIntervalMinutes'],
          message: 'repeatIntervalMinutes is required when scheduleType is "recurring"',
        });
      }
      if (val.repeatUntil === undefined) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['repeatUntil'],
          message: 'repeatUntil is required when scheduleType is "recurring"',
        });
      }
    }
    const isPostAction = val.actionType.startsWith('post_');
    if (isPostAction && !val.targetSlackChannelId) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['targetSlackChannelId'],
        message: `targetSlackChannelId is required for "${val.actionType}" action`,
      });
    }
    if (isPostAction && !val.targetSlackTeamId) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['targetSlackTeamId'],
        message: `targetSlackTeamId is required for "${val.actionType}" action`,
      });
    }
  });

export function registerCreateScheduledWorkflow(server: McpServer) {
  server.registerTool(
    'create_scheduled_workflow',
    {
      description:
        'Schedule an automated action for an incident (e.g. post a summary to Slack). Supports delay (minutes from now), specific_time (ISO 8601), or recurring (interval + end time). Post actions require targetSlackChannelId and targetSlackTeamId.',
      inputSchema: z.object(inputObject.shape),
    },
    async (raw) => {
      const parsed = inputSchema.safeParse(raw);
      if (!parsed.success) {
        const message = parsed.error.issues.map((issue) => issue.message).join('; ');
        return {
          content: [{ type: 'text' as const, text: `Error creating scheduled workflow: ${message}` }],
          isError: true,
        };
      }
      const input = parsed.data;
      try {
        const body: JsonObject = {
          scheduleType: input.scheduleType,
          actionType: input.actionType,
        };
        if (input.delayMinutes !== undefined) body.delayMinutes = input.delayMinutes;
        if (input.scheduledAt !== undefined) body.scheduledAt = input.scheduledAt;
        if (input.repeatIntervalMinutes !== undefined) body.repeatIntervalMinutes = input.repeatIntervalMinutes;
        if (input.repeatUntil !== undefined) body.repeatUntil = input.repeatUntil;
        if (input.targetSlackChannelId !== undefined) body.targetSlackChannelId = input.targetSlackChannelId;
        if (input.targetSlackTeamId !== undefined) body.targetSlackTeamId = input.targetSlackTeamId;
        if (input.targetThreadTs !== undefined) body.targetThreadTs = input.targetThreadTs;
        if (input.targetChannelName !== undefined) body.targetChannelName = input.targetChannelName;
        if (input.timezone !== undefined) body.timezone = input.timezone;

        const data = await api.createScheduledWorkflow(input.incidentId, body, { includeDrills: input.includeDrills });
        return { content: [{ type: 'text' as const, text: JSON.stringify(data, null, 2) }] };
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
        return {
          content: [{ type: 'text' as const, text: `Error creating scheduled workflow: ${errorMessage}` }],
          isError: true,
        };
      }
    },
  );
}
