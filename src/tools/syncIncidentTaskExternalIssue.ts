import { McpServer } from "@modelcontextprotocol/server";
import { z } from 'zod';
import { api } from '../client';
import { zIncludeDrills } from '../incidentZod';

export function registerSyncIncidentTaskExternalIssue(server: McpServer) {
  server.registerTool(
    'sync_incident_task_external_issue',
    {
      description:
        'Pull the latest status and field values from the linked external tracker issue and apply them to the incident task. Fails with 400 if the task is not linked.',
      inputSchema: z.object({
        incidentId: z.string().uuid().describe('The UUID of the incident'),
        includeDrills: zIncludeDrills,
        taskId: z.string().uuid().describe('The UUID of the task'),
      }),
    },
    async (input) => {
      try {
        const data = await api.syncIncidentTaskExternalIssue(input.incidentId, input.taskId, { includeDrills: input.includeDrills });
        return { content: [{ type: 'text' as const, text: JSON.stringify(data, null, 2) }] };
      } catch (error) {
        const msg = error instanceof Error ? error.message : 'Unknown error occurred';
        return {
          content: [{ type: 'text' as const, text: `Error syncing external issue: ${msg}` }],
          isError: true,
        };
      }
    },
  );
}
