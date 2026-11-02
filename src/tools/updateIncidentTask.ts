import { McpServer } from "@modelcontextprotocol/server";
import { z } from 'zod';
import { api } from '../client';
import { TASK_STATUSES, zActivityType, zIncludeDrills, zRelatedIncidents, zTaskStatus } from '../incidentZod';
import type { IncidentActivityType, JsonObject, JsonValue } from '../types';

type RelatedIncidentInput = {
  id: string;
  name?: string | null;
  severity?: number | null;
  status: string;
  createdAt: string;
  resolutionSummary?: string | null;
  similarity?: number;
};

type UpdateIncidentTaskInput = {
  incidentId: string;
  taskId: string;
  title?: string;
  content?: string | null;
  currentStatus?: (typeof TASK_STATUSES)[number];
  dueDate?: string | null;
  assigneeEmail?: string | null;
  relatedIncidents?: RelatedIncidentInput[] | null;
  activityType?: IncidentActivityType | null;
  includeDrills?: boolean;
};

export function registerUpdateIncidentTask(server: McpServer) {
  server.registerTool(
    'update_incident_task',
    {
      description:
        'Update an incident task. Send at least one field. Transitioning to "done" requires admin authority.',
      inputSchema: z.object({
        incidentId: z.string().uuid().describe('The UUID of the incident'),
        taskId: z.string().uuid().describe('The UUID of the task to update'),
        title: z.string().min(1).max(255).optional().describe('New task title'),
        content: z
          .string()
          .nullable()
          .optional()
          .describe('New task description; null clears it'),
        currentStatus: zTaskStatus
          .optional()
          .describe(`New task status. Options: ${TASK_STATUSES.join(', ')}`),
        dueDate: z
          .string()
          .datetime()
          .nullable()
          .optional()
          .describe('New due date as ISO 8601 datetime; null clears it'),
        assigneeEmail: z
          .string()
          .email()
          .nullable()
          .optional()
          .describe('Email of member to assign; null clears assignment'),
        relatedIncidents: zRelatedIncidents,
        activityType: zActivityType,
        includeDrills: zIncludeDrills,
      }),
    },
    async (input: UpdateIncidentTaskInput) => {
      try {
        const body: JsonObject = {};
        if (input.title !== undefined) body.title = input.title;
        if (input.content !== undefined) body.content = input.content;
        if (input.currentStatus !== undefined) body.currentStatus = input.currentStatus;
        if (input.dueDate !== undefined) body.dueDate = input.dueDate;
        if (input.assigneeEmail !== undefined) body.assigneeEmail = input.assigneeEmail;
        if (input.relatedIncidents !== undefined) {
          body.relatedIncidents = input.relatedIncidents as JsonValue;
        }
        if (input.activityType !== undefined) body.activityType = input.activityType;

        if (Object.keys(body).length === 0) {
          return {
            content: [{ type: 'text' as const, text: 'Error: provide at least one field to update.' }],
            isError: true,
          };
        }

        const data = await api.updateIncidentTask(input.incidentId, input.taskId, body, {
          includeDrills: input.includeDrills,
        });
        return { content: [{ type: 'text' as const, text: JSON.stringify(data, null, 2) }] };
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
        return {
          content: [{ type: 'text' as const, text: `Error updating incident task: ${errorMessage}` }],
          isError: true,
        };
      }
    },
  );
}
