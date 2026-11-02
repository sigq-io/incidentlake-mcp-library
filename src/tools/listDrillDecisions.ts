import { McpServer } from "@modelcontextprotocol/server";
import { z } from 'zod';
import { api } from '../client';

export function registerListDrillDecisions(server: McpServer) {
  server.registerTool(
    'list_drill_decisions',
    {
      description:
        'List decisions recorded during a drill. Expected-action checks and facilitator actions are shown to controllers only, until the drill ends.',
      inputSchema: z.object({
        sessionId: z.string().uuid().describe('The UUID of the drill session'),
      }),
    },
    async (input) => {
      try {
        const data = await api.listDrillDecisions(input.sessionId);
        return { content: [{ type: 'text' as const, text: JSON.stringify(data, null, 2) }] };
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
        return {
          content: [{ type: 'text' as const, text: `Error listing drill decisions: ${errorMessage}` }],
          isError: true,
        };
      }
    },
  );
}
