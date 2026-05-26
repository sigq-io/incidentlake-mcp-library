import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { api } from '../client';
import type { JsonObject } from '../types';

const VALID_TASK_STATUSES = ['draft', 'todo', 'wip', 'in_review', 'done', 'cancelled'] as const;

export function registerCreateIncidentTask(server: McpServer) {
  server.registerTool(
    'create_incident_task',
    {
      description:
        'Create a task for an incident. Tasks track work items during incident response. Setting status to "done" requires admin authority.',
      inputSchema: z.object({
        incidentId: z.string().uuid().describe('The UUID of the incident'),
        title: z.string().min(1).max(255).describe('Task title (max 255 characters)'),
        content: z
          .string()
          .nullable()
          .optional()
          .describe('Optional task description or details'),
        currentStatus: z
          .enum(VALID_TASK_STATUSES)
          .optional()
          .describe(`Task status (default: draft). Options: ${VALID_TASK_STATUSES.join(', ')}`),
        dueDate: z
          .string()
          .datetime()
          .nullable()
          .optional()
          .describe('Optional due date as ISO 8601 datetime'),
        assigneeEmail: z
          .string()
          .email()
          .nullable()
          .optional()
          .describe('Email of the tenant member to assign the task to; null clears assignment'),
      }),
    },
    async (input) => {
      try {
        const body: JsonObject = { title: input.title };
        if (input.content !== undefined) body.content = input.content;
        if (input.currentStatus !== undefined) body.currentStatus = input.currentStatus;
        if (input.dueDate !== undefined) body.dueDate = input.dueDate;
        if (input.assigneeEmail !== undefined) body.assigneeEmail = input.assigneeEmail;

        const data = await api.createIncidentTask(input.incidentId, body);
        return { content: [{ type: 'text' as const, text: JSON.stringify(data, null, 2) }] };
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
        return {
          content: [{ type: 'text' as const, text: `Error creating incident task: ${errorMessage}` }],
          isError: true,
        };
      }
    },
  );
}
