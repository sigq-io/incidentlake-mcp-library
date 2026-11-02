import { McpServer } from "@modelcontextprotocol/server";
import { z } from 'zod';
import { api } from '../client';

export function registerResumeDrillSession(server: McpServer) {
  server.registerTool(
    'resume_drill_session',
    {
      description: 'Resume a paused drill session. Controllers only.',
      inputSchema: z.object({
        sessionId: z.string().uuid().describe('The UUID of the drill session'),
      }),
    },
    async (input) => {
      try {
        const data = await api.resumeDrillSession(input.sessionId);
        return { content: [{ type: 'text' as const, text: JSON.stringify(data, null, 2) }] };
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
        return {
          content: [{ type: 'text' as const, text: `Error resuming drill session: ${errorMessage}` }],
          isError: true,
        };
      }
    },
  );
}
