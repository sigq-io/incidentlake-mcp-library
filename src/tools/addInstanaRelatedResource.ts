import { McpServer } from "@modelcontextprotocol/server";
import { z } from 'zod';
import { api } from '../client';
import { zIncludeDrills } from '../incidentZod';
import type { JsonObject } from '../types';

type AddInstanaRelatedResourceInput = {
  incidentId: string;
  includeDrills?: boolean;
  eventId: string;
  name?: string;
};

export function registerAddInstanaRelatedResource(server: McpServer) {
  server.registerTool(
    'add_instana_related_resource',
    {
      description:
        'Link an Instana event (from search_instana_events) to an incident as a related resource. If this event was already linked, the existing link is returned.',
      inputSchema: z.object({
        incidentId: z.string().uuid().describe('The UUID of the incident'),
        includeDrills: zIncludeDrills,
        eventId: z.string().min(1).describe("Instana event's eventId"),
        name: z.string().optional().describe('Event name, used as the resource title'),
      }),
    },
    async (input: AddInstanaRelatedResourceInput) => {
      try {
        const body: JsonObject = { eventId: input.eventId };
        if (input.name !== undefined) body.name = input.name;
        const data = await api.addInstanaRelatedResource(input.incidentId, body, { includeDrills: input.includeDrills });
        return { content: [{ type: 'text' as const, text: JSON.stringify(data, null, 2) }] };
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
        return {
          content: [{ type: 'text' as const, text: `Error linking Instana event: ${errorMessage}` }],
          isError: true,
        };
      }
    },
  );
}
