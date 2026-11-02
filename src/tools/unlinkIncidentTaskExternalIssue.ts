import { McpServer } from "@modelcontextprotocol/server";
import { z } from 'zod';
import { api } from '../client';
import { zIncludeDrills } from '../incidentZod';

export function registerUnlinkIncidentTaskExternalIssue(server: McpServer) {
  server.registerTool(
    'unlink_incident_task_external_issue',
    {
      description:
        'Remove the external tracker link from an incident task. The task keeps its current field values; the issue itself is not deleted.',
      inputSchema: z.object({
        incidentId: z.string().uuid().describe('The UUID of the incident'),
        includeDrills: zIncludeDrills,
        taskId: z.string().uuid().describe('The UUID of the task'),
      }),
    },
    async (input) => {
      try {
        const data = await api.unlinkIncidentTaskExternalIssue(input.incidentId, input.taskId, { includeDrills: input.includeDrills });
        return { content: [{ type: 'text' as const, text: JSON.stringify(data, null, 2) }] };
      } catch (error) {
        const msg = error instanceof Error ? error.message : 'Unknown error occurred';
        return {
          content: [{ type: 'text' as const, text: `Error unlinking external issue: ${msg}` }],
          isError: true,
        };
      }
    },
  );
}
