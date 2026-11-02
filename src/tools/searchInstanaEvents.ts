import { McpServer } from "@modelcontextprotocol/server";
import { z } from 'zod';
import { api } from '../client';

export function registerSearchInstanaEvents(server: McpServer) {
  server.registerTool(
    'search_instana_events',
    {
      description:
        "Search the tenant's connected Instana instance for live events (issues/incidents). Requires the Instana integration to be configured for this tenant; returns an error otherwise. Only Warning/Critical events are returned — routine 'Change' events (deploys, node online/offline, etc.) are excluded as noise. Use the returned eventId with add_instana_related_resource or create_incident_from_instana_event.",
      inputSchema: z.object({
        query: z.string().optional().describe('Optional text filter matched against the event name'),
      }),
    },
    async (input) => {
      try {
        const data = await api.searchInstanaEvents(input.query);
        return { content: [{ type: 'text' as const, text: JSON.stringify(data, null, 2) }] };
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
        return {
          content: [{ type: 'text' as const, text: `Error searching Instana events: ${errorMessage}` }],
          isError: true,
        };
      }
    },
  );
}
