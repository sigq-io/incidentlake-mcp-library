import { McpServer } from "@modelcontextprotocol/server";
import { z } from 'zod';
import { api } from '../client';

export function registerGetDrillDebrief(server: McpServer) {
  server.registerTool(
    'get_drill_debrief',
    {
      description:
        'Get the debrief of a drill session, including KPIs and proposed improvements. Returns null when none has been generated yet.',
      inputSchema: z.object({
        sessionId: z.string().uuid().describe('The UUID of the drill session'),
      }),
    },
    async (input) => {
      try {
        const data = await api.getDrillDebrief(input.sessionId);
        return { content: [{ type: 'text' as const, text: JSON.stringify(data, null, 2) }] };
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
        return {
          content: [{ type: 'text' as const, text: `Error fetching drill debrief: ${errorMessage}` }],
          isError: true,
        };
      }
    },
  );
}
