import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { api } from '../client';
import type { JsonObject } from '../types';

export function registerCreateIncidentPhaseCapture(server: McpServer) {
  server.registerTool(
    'create_incident_phase_capture',
    {
      description:
        'Record that a response timeline phase was reached at a given time for an incident (e.g. "customer was notified at 14:32"). Use get_incident_phase_graph first to find a valid nodeId.',
      inputSchema: z.object({
        incidentId: z.string().uuid().describe('The UUID of the incident'),
        nodeId: z
          .string()
          .uuid()
          .describe(
            'The phase graph node UUID this capture belongs to (from get_incident_phase_graph)',
          ),
        capturedAt: z
          .string()
          .datetime()
          .optional()
          .describe('When the phase was reached, as an ISO 8601 datetime. Defaults to now if omitted.'),
        note: z.string().nullable().optional().describe('Optional note about this capture'),
      }),
    },
    async (input) => {
      try {
        const body: JsonObject = { nodeId: input.nodeId };
        if (input.capturedAt !== undefined) body.capturedAt = input.capturedAt;
        if (input.note !== undefined) body.note = input.note;

        const data = await api.createIncidentPhaseCapture(input.incidentId, body);
        return { content: [{ type: 'text' as const, text: JSON.stringify(data, null, 2) }] };
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
        return {
          content: [
            { type: 'text' as const, text: `Error creating incident phase capture: ${errorMessage}` },
          ],
          isError: true,
        };
      }
    },
  );
}
