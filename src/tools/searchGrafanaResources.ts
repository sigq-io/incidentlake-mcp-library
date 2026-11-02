import { McpServer } from "@modelcontextprotocol/server";
import { z } from 'zod';
import { api } from '../client';

export function registerSearchGrafanaResources(server: McpServer) {
  server.registerTool(
    'search_grafana_resources',
    {
      description:
        "Search the tenant's connected Grafana instance for dashboards and alert rules (GET /v1/integrations/grafana/search). Requires the Grafana integration to be configured. Pass each hit's uid and kind to add_grafana_related_resource to link it to an incident.",
      inputSchema: z.object({
        query: z.string().optional().describe('Optional text filter matched against dashboard and alert titles'),
      }),
    },
    async (input) => {
      try {
        const data = await api.searchGrafanaResources(input.query);
        return { content: [{ type: 'text' as const, text: JSON.stringify(data, null, 2) }] };
      } catch (error) {
        const msg = error instanceof Error ? error.message : 'Unknown error occurred';
        return {
          content: [{ type: 'text' as const, text: `Error searching Grafana: ${msg}` }],
          isError: true,
        };
      }
    },
  );
}
