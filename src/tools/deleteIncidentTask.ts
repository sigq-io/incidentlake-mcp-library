import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { api } from '../client';

export function registerDeleteIncidentTask(server: McpServer) {
  server.registerTool(
    'delete_incident_task',
    {
      description: 'Delete a task from an incident.',
      inputSchema: z.object({
        incidentId: z.string().uuid().describe('The UUID of the incident'),
        taskId: z.string().uuid().describe('The UUID of the task to delete'),
      }),
    },
    async (input) => {
      try {
        const data = await api.deleteIncidentTask(input.incidentId, input.taskId);
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
