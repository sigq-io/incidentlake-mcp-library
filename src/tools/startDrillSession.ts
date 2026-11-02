import { McpServer } from "@modelcontextprotocol/server";
import { z } from 'zod';
import { api } from '../client';

export function registerStartDrillSession(server: McpServer) {
  server.registerTool(
    'start_drill_session',
    {
      description:
        'Start a scheduled drill session. Controllers only. Starting begins the drill clock and hands out the cards that are due.',
      inputSchema: z.object({
        sessionId: z.string().uuid().describe('The UUID of the drill session'),
      }),
    },
    async (input) => {
      try {
        const data = await api.startDrillSession(input.sessionId);
        return { content: [{ type: 'text' as const, text: JSON.stringify(data, null, 2) }] };
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
        return {
          content: [{ type: 'text' as const, text: `Error starting drill session: ${errorMessage}` }],
          isError: true,
        };
      }
    },
  );
}
