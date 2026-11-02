import { McpServer } from "@modelcontextprotocol/server";
import { z } from 'zod';
import { api } from '../client';

export function registerCompleteDrillSession(server: McpServer) {
  server.registerTool(
    'complete_drill_session',
    {
      description:
        'Complete a drill session. Controllers only. Completing reveals the answer key and opens the debrief.',
      inputSchema: z.object({
        sessionId: z.string().uuid().describe('The UUID of the drill session'),
      }),
    },
    async (input) => {
      try {
        const data = await api.completeDrillSession(input.sessionId);
        return { content: [{ type: 'text' as const, text: JSON.stringify(data, null, 2) }] };
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
        return {
          content: [
            { type: 'text' as const, text: `Error completing drill session: ${errorMessage}` },
          ],
          isError: true,
        };
      }
    },
  );
}
