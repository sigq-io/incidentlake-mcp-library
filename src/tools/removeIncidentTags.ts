import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { api } from '../client';
import { requiredNonEmptyStringArraySchema } from '../coerceArrays';

export function registerRemoveIncidentTags(server: McpServer) {
  server.registerTool(
    'remove_incident_tags',
    {
      description:
        'Remove listed tags from an incident (DELETE /v1/incidents/{id}/tags with body). Other tags unchanged.',
      inputSchema: z.object({
        incidentId: z.string().uuid(),
        tags: requiredNonEmptyStringArraySchema.describe(
          'Tag strings to remove; array or comma-separated string.',
        ),
      }),
    },
    async (input) => {
      try {
        const data = await api.removeIncidentTags(input.incidentId, input.tags);
        return { content: [{ type: 'text' as const, text: JSON.stringify(data, null, 2) }] };
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
        return {
          content: [
            { type: 'text' as const, text: `Error removing incident tags: ${errorMessage}` },
          ],
          isError: true,
        };
      }
    },
  );
}
