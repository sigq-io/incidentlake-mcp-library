import { McpServer } from "@modelcontextprotocol/server";
import { z } from 'zod';
import { api } from '../client';
import { zIncludeDrills } from '../incidentZod';
import { requiredNonEmptyStringArraySchema } from '../coerceArrays';

type AddRelatedResourcesInput = {
  incidentId: string;
  includeDrills?: boolean;
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
        includeDrills: zIncludeDrills,
        resourceIds: requiredNonEmptyStringArraySchema.describe(
          'One or more external_web_resources UUIDs to link to the incident',
        ),
      }),
    },
    async (input: AddRelatedResourcesInput) => {
      try {
        const data = await api.addRelatedResources(input.incidentId, input.resourceIds, { includeDrills: input.includeDrills });
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
