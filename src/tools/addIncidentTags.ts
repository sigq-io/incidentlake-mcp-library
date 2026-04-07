import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { api } from '../client';
import { requiredNonEmptyStringArraySchema } from '../coerceArrays';

export function registerAddIncidentTags(server: McpServer) {
  server.registerTool(
    'add_incident_tags',
    {
      description:
        'Merge tags into an incident (POST /v1/incidents/{id}/tags). Duplicates ignored; returns full incident.',
      inputSchema: z.object({
        incidentId: z.string().uuid(),
        tags: requiredNonEmptyStringArraySchema.describe(
          'Non-empty tag strings, e.g. client:acme, urgency:high; array or comma-separated string.',
        ),
      }),
    },
    async (input) => {
      try {
        const data = await api.addIncidentTags(input.incidentId, input.tags);
        return { content: [{ type: 'text' as const, text: JSON.stringify(data, null, 2) }] };
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
        return {
          content: [{ type: 'text' as const, text: `Error adding incident tags: ${errorMessage}` }],
          isError: true,
        };
      }
    },
  );
}
