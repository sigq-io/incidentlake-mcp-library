import { McpServer } from "@modelcontextprotocol/server";
import { z } from 'zod';
import { api } from '../client';

export function registerDeliverDrillInject(server: McpServer) {
  server.registerTool(
    'deliver_drill_inject',
    {
      description:
        'Hand out a scheduled drill card ahead of its time. Controllers only. Fails if the card was already delivered or the drill is not running.',
      inputSchema: z.object({
        sessionId: z.string().uuid().describe('The UUID of the drill session'),
        seq: z.number().int().describe('Inject seq from the scenario'),
      }),
    },
    async (input) => {
      try {
        const data = await api.deliverDrillInject(input.sessionId, input.seq);
        return { content: [{ type: 'text' as const, text: JSON.stringify(data, null, 2) }] };
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
        return {
          content: [{ type: 'text' as const, text: `Error delivering drill inject: ${errorMessage}` }],
          isError: true,
        };
      }
    },
  );
}
