import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { api } from '../client';

export function registerListIncidentTasks(server: McpServer) {
  server.registerTool(
    'list_incident_tasks',
    {
      description: 'List all tasks for an incident, including their reports and reviews.',
      inputSchema: z.object({
        incidentId: z.string().uuid().describe('The UUID of the incident'),
      }),
    },
    async (input) => {
      try {
        const data = await api.listIncidentTasks(input.incidentId);
        return { content: [{ type: 'text' as const, text: JSON.stringify(data, null, 2) }] };
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
        return {
          content: [{ type: 'text' as const, text: `Error listing incident tasks: ${errorMessage}` }],
          isError: true,
        };
      }
    },
  );
}
