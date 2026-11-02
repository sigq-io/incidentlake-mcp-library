import { McpServer } from "@modelcontextprotocol/server";
import { z } from 'zod';
import { api } from '../client';
import { zIncludeDrills } from '../incidentZod';
import type { JsonObject } from '../types';

type Input = {
  incidentId: string;
  includeDrills?: boolean;
  uid: string;
  kind: 'dashboard' | 'alert';
  name?: string;
};

export function registerAddGrafanaRelatedResource(server: McpServer) {
  server.registerTool(
    'add_grafana_related_resource',
    {
      description:
        'Link a Grafana dashboard or alert rule (from search_grafana_resources) to an incident as a related resource. The click-through URL is built server-side from the tenant\'s Grafana integration settings. If this item was already linked, the existing link is returned.',
      inputSchema: z.object({
        incidentId: z.string().uuid().describe('The UUID of the incident'),
        includeDrills: zIncludeDrills,
        uid: z.string().min(1).describe('Grafana dashboard or alert rule uid'),
        kind: z.enum(['dashboard', 'alert']).describe('Whether the uid is a dashboard or alert rule'),
        name: z.string().optional().describe('Title, used as the resource title'),
      }),
    },
    async (input: Input) => {
      try {
        const body: JsonObject = { uid: input.uid, kind: input.kind };
        if (input.name !== undefined) body.name = input.name;
        const data = await api.addIncidentRelatedResourceByGrafanaItem(input.incidentId, body, { includeDrills: input.includeDrills });
        return { content: [{ type: 'text' as const, text: JSON.stringify(data, null, 2) }] };
      } catch (error) {
        const msg = error instanceof Error ? error.message : 'Unknown error occurred';
        return {
          content: [{ type: 'text' as const, text: `Error linking Grafana item: ${msg}` }],
          isError: true,
        };
      }
    },
  );
}
