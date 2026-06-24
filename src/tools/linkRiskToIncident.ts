import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { api } from '../client';

export function registerLinkRiskToIncident(server: McpServer) {
  server.registerTool(
    'link_risk_to_incident',
    {
      description: 'Link a risk to an incident, associating the risk with that incident.',
      inputSchema: z.object({
        riskId: z.string().uuid().describe('The UUID of the risk'),
        incidentId: z.string().uuid().describe('The UUID of the incident to link to this risk'),
      }),
    },
    async (input) => {
      try {
        const data = await api.linkRiskToIncident(input.riskId, input.incidentId);
        return { content: [{ type: 'text' as const, text: JSON.stringify(data, null, 2) }] };
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
        return {
          content: [{ type: 'text' as const, text: `Error linking risk to incident: ${errorMessage}` }],
          isError: true,
        };
      }
    },
  );
}
