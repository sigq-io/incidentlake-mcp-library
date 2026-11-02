import { McpServer } from "@modelcontextprotocol/server";
import { z } from 'zod';
import { api } from '../client';
import { zIncludeDrills } from '../incidentZod';

export function registerPublishIncidentSeverity(server: McpServer) {
  server.registerTool(
    'publish_incident_severity',
    {
      description:
        'Publish a severity draft (sets isDraft to false). Only draft records can be published.',
      inputSchema: z.object({
        incidentId: z.string().uuid().describe('The UUID of the incident'),
        includeDrills: zIncludeDrills,
        severityId: z.string().uuid().describe('The UUID of the severity draft to publish'),
      }),
    },
    async (input) => {
      try {
        const data = await api.publishIncidentSeverity(input.incidentId, input.severityId, { includeDrills: input.includeDrills });
        return { content: [{ type: 'text' as const, text: JSON.stringify(data, null, 2) }] };
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
        return {
          content: [{ type: 'text' as const, text: `Error publishing incident severity: ${errorMessage}` }],
          isError: true,
        };
      }
    },
  );
}
