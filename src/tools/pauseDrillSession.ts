import { McpServer } from "@modelcontextprotocol/server";
import { z } from 'zod';
import { api } from '../client';

export function registerPauseDrillSession(server: McpServer) {
  server.registerTool(
    'pause_drill_session',
    {
      description: 'Pause a running drill session. Controllers only.',
      inputSchema: z.object({
        sessionId: z.string().uuid().describe('The UUID of the drill session'),
      }),
    },
    async (input) => {
      try {
        const data = await api.pauseDrillSession(input.sessionId);
        return { content: [{ type: 'text' as const, text: JSON.stringify(data, null, 2) }] };
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
        return {
          content: [{ type: 'text' as const, text: `Error pausing drill session: ${errorMessage}` }],
          isError: true,
        };
      }
    },
  );
}
