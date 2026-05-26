import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { api } from '../client';

export function registerGetCommanderHistory(server: McpServer) {
  server.registerTool(
    'get_commander_history',
    {
      description:
        'Get the full commander assignment history for an incident. Returns all entries newest-first, with member name and email when resolvable.',
      inputSchema: z.object({
        incidentId: z.string().uuid().describe('The UUID of the incident'),
      }),
    },
    async (input) => {
      try {
        const data = await api.getCommanderHistory(input.incidentId);
        return { content: [{ type: 'text' as const, text: JSON.stringify(data, null, 2) }] };
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
        return {
          content: [{ type: 'text' as const, text: `Error getting commander history: ${errorMessage}` }],
          isError: true,
        };
      }
    },
  );
}
