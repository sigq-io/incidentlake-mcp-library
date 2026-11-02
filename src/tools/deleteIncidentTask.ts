import { McpServer } from "@modelcontextprotocol/server";
import { z } from 'zod';
import { api } from '../client';
import { zIncludeDrills } from '../incidentZod';

export function registerDeleteIncidentTask(server: McpServer) {
  server.registerTool(
    'delete_incident_task',
    {
      description: 'Delete a task from an incident.',
      inputSchema: z.object({
        incidentId: z.string().uuid().describe('The UUID of the incident'),
        includeDrills: zIncludeDrills,
        taskId: z.string().uuid().describe('The UUID of the task to delete'),
      }),
    },
    async (input) => {
      try {
        const data = await api.deleteIncidentTask(input.incidentId, input.taskId, { includeDrills: input.includeDrills });
        return { content: [{ type: 'text' as const, text: JSON.stringify(data, null, 2) }] };
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
        return {
          content: [{ type: 'text' as const, text: `Error deleting incident task: ${errorMessage}` }],
          isError: true,
        };
      }
    },
  );
}
