import { McpServer } from "@modelcontextprotocol/server";
import { z } from 'zod';
import { api } from '../client';
import { zIncludeDrills } from '../incidentZod';
import type { JsonObject } from '../types';

type AddZabbixRelatedResourceInput = {
  incidentId: string;
  includeDrills?: boolean;
  eventId: string;
  triggerId: string;
  name?: string;
};

export function registerAddZabbixRelatedResource(server: McpServer) {
  server.registerTool(
    'add_zabbix_related_resource',
    {
      description:
        'Link a Zabbix problem (from search_zabbix_problems) to an incident as a related resource. If this problem was already linked, the existing link is returned.',
      inputSchema: z.object({
        incidentId: z.string().uuid().describe('The UUID of the incident'),
        includeDrills: zIncludeDrills,
        eventId: z.string().min(1).describe("Zabbix problem's eventid"),
        triggerId: z.string().min(1).describe("Zabbix problem's objectid (trigger id)"),
        name: z.string().optional().describe('Problem name, used as the resource title'),
      }),
    },
    async (input: AddZabbixRelatedResourceInput) => {
      try {
        const body: JsonObject = { eventId: input.eventId, triggerId: input.triggerId };
        if (input.name !== undefined) body.name = input.name;
        const data = await api.addZabbixRelatedResource(input.incidentId, body, { includeDrills: input.includeDrills });
        return { content: [{ type: 'text' as const, text: JSON.stringify(data, null, 2) }] };
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
        return {
          content: [{ type: 'text' as const, text: `Error linking Zabbix problem: ${errorMessage}` }],
          isError: true,
        };
      }
    },
  );
}
