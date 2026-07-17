import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { api } from '../client';
import type { JsonObject } from '../types';

export function registerCreateIncidentPhaseNode(server: McpServer) {
  server.registerTool(
    'create_incident_phase_node',
    {
      description:
        'Add a phase (node) to an incident\'s response timeline. If the incident is still using the tenant default timeline, this forks a private copy for the incident first — call get_incident_phase_graph again afterwards to pick up the forked node/edge ids.',
      inputSchema: z.object({
        incidentId: z.string().uuid().describe('The UUID of the incident'),
        label: z.string().min(1).describe('Phase name'),
        description: z.string().nullable().optional().describe('Optional phase description'),
        positionX: z.number().optional().describe('Canvas X position (defaults to 0)'),
        positionY: z.number().optional().describe('Canvas Y position (defaults to 0)'),
        sortOrder: z.number().int().optional().describe('Sort order (defaults to 0)'),
      }),
    },
    async (input) => {
      try {
        const body: JsonObject = { label: input.label };
        if (input.description !== undefined) body.description = input.description;
        if (input.positionX !== undefined) body.positionX = input.positionX;
        if (input.positionY !== undefined) body.positionY = input.positionY;
        if (input.sortOrder !== undefined) body.sortOrder = input.sortOrder;

        const data = await api.createIncidentPhaseNode(input.incidentId, body);
        return { content: [{ type: 'text' as const, text: JSON.stringify(data, null, 2) }] };
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
        return {
          content: [
            { type: 'text' as const, text: `Error creating incident phase node: ${errorMessage}` },
          ],
          isError: true,
        };
      }
    },
  );
}
