import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { api } from '../client';

export function registerGetIncidentPhaseTelemetry(server: McpServer) {
  server.registerTool(
    'get_incident_phase_telemetry',
    {
      description:
        'Get computed response timeline telemetry for an incident: per-phase capture counts, elapsed time between phases, and time-to-first-customer-communication / customer-handling-duration rollups.',
      inputSchema: z.object({
        incidentId: z.string().uuid().describe('The UUID of the incident'),
      }),
    },
    async (input) => {
      try {
        const data = await api.getIncidentPhaseTelemetry(input.incidentId);
        return { content: [{ type: 'text' as const, text: JSON.stringify(data, null, 2) }] };
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
        return {
          content: [
            { type: 'text' as const, text: `Error getting incident phase telemetry: ${errorMessage}` },
          ],
          isError: true,
        };
      }
    },
  );
}
