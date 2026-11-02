import { McpServer } from "@modelcontextprotocol/server";
import { z } from 'zod';
import { api } from '../client';

export function registerSearchZabbixProblems(server: McpServer) {
  server.registerTool(
    'search_zabbix_problems',
    {
      description:
        "Search the tenant's connected Zabbix instance for live problems (alerts). Requires the Zabbix integration to be configured for this tenant; returns an error otherwise. Use the returned eventId/triggerId with add_zabbix_related_resource or create_incident_from_zabbix_problem.",
      inputSchema: z.object({
        query: z.string().optional().describe('Optional text filter matched against the problem name'),
      }),
    },
    async (input) => {
      try {
        const data = await api.searchZabbixProblems(input.query);
        return { content: [{ type: 'text' as const, text: JSON.stringify(data, null, 2) }] };
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
        return {
          content: [{ type: 'text' as const, text: `Error searching Zabbix problems: ${errorMessage}` }],
          isError: true,
        };
      }
    },
  );
}
