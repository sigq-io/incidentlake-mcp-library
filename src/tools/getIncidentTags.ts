import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { api } from '../client';

export function registerGetIncidentTags(server: McpServer) {
  server.registerTool(
    'get_incident_tags',
    {
      description:
        'Get categorization tags for an incident (GET /v1/incidents/{id}/tags). Distinct from RBAC tags.',
      inputSchema: z.object({
        incidentId: z.string().uuid().describe('Incident UUID'),
      }),
    },
    async (input) => {
      try {
        const data = await api.getIncidentTags(input.incidentId);
        return { content: [{ type: 'text' as const, text: JSON.stringify(data, null, 2) }] };
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
        return {
          content: [{ type: 'text' as const, text: `Error fetching incident tags: ${errorMessage}` }],
          isError: true,
        };
      }
    },
  );
}
