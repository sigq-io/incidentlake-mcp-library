import { McpServer } from "@modelcontextprotocol/server";
import { z } from 'zod';
import { api } from '../client';
import { zIncludeDrills } from '../incidentZod';
import { coercedTagArraySchema } from '../coerceArrays';

export function registerReplaceIncidentTags(server: McpServer) {
  server.registerTool(
    'replace_incident_tags',
    {
      description:
        'Replace all categorization tags on an incident (PATCH /v1/incidents/{id}/tags). Pass empty array to clear.',
      inputSchema: z.object({
        incidentId: z.string().uuid(),
        includeDrills: zIncludeDrills,
        tags: coercedTagArraySchema.describe(
          'New full tag set (replaces existing). Empty array clears tags. Array or comma-separated string.',
        ),
      }),
    },
    async (input) => {
      try {
        const data = await api.updateIncidentTags(input.incidentId, input.tags, { includeDrills: input.includeDrills });
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
