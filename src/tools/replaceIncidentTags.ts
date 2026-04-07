import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { api } from '../client';

export function registerReplaceIncidentTags(server: McpServer) {
  server.registerTool(
    'replace_incident_tags',
    {
      description:
        'Replace all categorization tags on an incident (PATCH /v1/incidents/{id}/tags). Pass empty array to clear.',
      inputSchema: z.object({
        incidentId: z.string().uuid(),
        tags: z
          .array(z.string().min(1))
          .describe('New full tag set (replaces existing). Empty array clears tags.'),
      }),
    },
    async (input) => {
      try {
        const data = await api.updateIncidentTags(input.incidentId, input.tags);
        return { content: [{ type: 'text' as const, text: JSON.stringify(data, null, 2) }] };
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
        return {
          content: [
            { type: 'text' as const, text: `Error replacing incident tags: ${errorMessage}` },
          ],
          isError: true,
        };
      }
    },
  );
}
