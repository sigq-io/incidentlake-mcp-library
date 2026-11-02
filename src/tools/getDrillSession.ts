import { McpServer } from "@modelcontextprotocol/server";
import { z } from 'zod';
import { api } from '../client';

export function registerGetDrillSession(server: McpServer) {
  server.registerTool(
    'get_drill_session',
    {
      description:
        'Get a drill session, including viewerRole. Until the drill ends, participants see only the cards already handed out, without the answer key.',
      inputSchema: z.object({
        sessionId: z.string().uuid().describe('The UUID of the drill session'),
      }),
    },
    async (input) => {
      try {
        const data = await api.getDrillSession(input.sessionId);
        return { content: [{ type: 'text' as const, text: JSON.stringify(data, null, 2) }] };
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
        return {
          content: [{ type: 'text' as const, text: `Error fetching drill session: ${errorMessage}` }],
          isError: true,
        };
      }
    },
  );
}
