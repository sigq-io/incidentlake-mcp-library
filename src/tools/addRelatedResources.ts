import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { api } from '../client';
import { requiredNonEmptyStringArraySchema } from '../coerceArrays';

type AddRelatedResourcesInput = {
  incidentId: string;
  resourceIds: string[];
};

export function registerAddRelatedResources(server: McpServer) {
  server.registerTool(
    'add_related_resources',
    {
      description:
        'Link external resources to an incident by their UUIDs. Duplicate links are skipped; only newly inserted rows are returned.',
      inputSchema: z.object({
        incidentId: z.string().uuid().describe('The UUID of the incident'),
        resourceIds: requiredNonEmptyStringArraySchema.describe(
          'One or more external_web_resources UUIDs to link to the incident',
        ),
      }) as z.ZodType<AddRelatedResourcesInput>,
    },
    async (input: AddRelatedResourcesInput) => {
      try {
        const data = await api.addRelatedResources(input.incidentId, input.resourceIds);
        return { content: [{ type: 'text' as const, text: JSON.stringify(data, null, 2) }] };
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
        return {
          content: [{ type: 'text' as const, text: `Error adding related resources: ${errorMessage}` }],
          isError: true,
        };
      }
    },
  );
}
