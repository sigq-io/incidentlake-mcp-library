import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { api } from '../client';

export function registerListIncidentSeverities(server: McpServer) {
  server.registerTool(
    'list_incident_severities',
    {
      description:
        'List all severity records for an incident, including the latest draft, latest published, and full history.',
      inputSchema: z.object({
        incidentId: z.string().uuid().describe('The UUID of the incident'),
      }),
    },
    async (input) => {
      try {
        const data = await api.listIncidentSeverities(input.incidentId);
        return { content: [{ type: 'text' as const, text: JSON.stringify(data, null, 2) }] };
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
        return {
          content: [{ type: 'text' as const, text: `Error listing incident severities: ${errorMessage}` }],
          isError: true,
        };
      }
    },
  );
}
