import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { api } from '../client';
import { requiredNonEmptyStringArraySchema } from '../coerceArrays';

type UpdateIncidentServicesInput = {
  incidentId: string;
  serviceIds: string[];
};

export function registerUpdateIncidentServices(server: McpServer) {
  server.registerTool(
    'update_incident_services',
    {
      description:
        'Replace the full list of services linked to an incident. Pass an empty array to clear all linked services.',
      inputSchema: z.object({
        incidentId: z.string().uuid().describe('The UUID of the incident'),
        serviceIds: requiredNonEmptyStringArraySchema.describe(
          'Complete list of service UUIDs for this incident. Pass [] to clear.',
        ),
      }) as z.ZodType<UpdateIncidentServicesInput>,
    },
    async (input: UpdateIncidentServicesInput) => {
      try {
        const data = await api.updateIncidentServices(input.incidentId, input.serviceIds);
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
