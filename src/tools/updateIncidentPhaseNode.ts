import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { api } from '../client';
import type { JsonObject } from '../types';

export function registerUpdateIncidentPhaseNode(server: McpServer) {
  server.registerTool(
    'update_incident_phase_node',
    {
      description:
        'Rename, redescribe, or reposition a phase on an incident\'s response timeline. Send at least one field. nodeId must come from get_incident_phase_graph after it returns isCustom true, or from a prior create_incident_phase_node call for this same incident.',
      inputSchema: z.object({
        incidentId: z.string().uuid().describe('The UUID of the incident'),
        nodeId: z.string().uuid().describe('The phase node UUID to update'),
        label: z.string().min(1).optional().describe('New phase name'),
        description: z
          .string()
          .nullable()
          .optional()
          .describe('New phase description; null clears it'),
        positionX: z.number().optional().describe('New canvas X position'),
        positionY: z.number().optional().describe('New canvas Y position'),
        sortOrder: z.number().int().optional().describe('New sort order'),
      }),
    },
    async (input) => {
      try {
        const body: JsonObject = {};
        if (input.label !== undefined) body.label = input.label;
        if (input.description !== undefined) body.description = input.description;
        if (input.positionX !== undefined) body.positionX = input.positionX;
        if (input.positionY !== undefined) body.positionY = input.positionY;
        if (input.sortOrder !== undefined) body.sortOrder = input.sortOrder;

        if (Object.keys(body).length === 0) {
          return {
            content: [{ type: 'text' as const, text: 'Error: provide at least one field to update.' }],
            isError: true,
          };
        }

        const data = await api.updateIncidentPhaseNode(input.incidentId, input.nodeId, body);
        return { content: [{ type: 'text' as const, text: JSON.stringify(data, null, 2) }] };
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
        return {
          content: [
            { type: 'text' as const, text: `Error updating incident phase node: ${errorMessage}` },
          ],
          isError: true,
        };
      }
    },
  );
}
