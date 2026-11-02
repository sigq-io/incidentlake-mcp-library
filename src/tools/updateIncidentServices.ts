import { McpServer } from "@modelcontextprotocol/server";
import { z } from 'zod';
import { api } from '../client';
import { zIncludeDrills } from '../incidentZod';
import { coerceInputToStringArray } from '../coerceArrays';

export function registerUpdateIncidentServices(server: McpServer) {
  server.registerTool(
    'update_incident_services',
    {
      description:
        'Replace the full list of services linked to an incident. Pass an empty array to clear all linked services.',
      inputSchema: z.object({
        incidentId: z.string().uuid().describe('The UUID of the incident'),
        includeDrills: zIncludeDrills,
        serviceIds: z
          .preprocess(coerceInputToStringArray, z.array(z.string().uuid()))
          .describe(
            'Complete list of service UUIDs for this incident. Pass [] to clear all linked services.',
          ),
      }),
    },
    async (input) => {
      try {
        const data = await api.updateIncidentServices(input.incidentId, input.serviceIds as string[], { includeDrills: input.includeDrills });
        return { content: [{ type: 'text' as const, text: JSON.stringify(data, null, 2) }] };
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
        return {
          content: [{ type: 'text' as const, text: `Error updating incident services: ${errorMessage}` }],
          isError: true,
        };
      }
    },
  );
}
