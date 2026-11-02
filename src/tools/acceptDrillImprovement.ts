import { McpServer } from "@modelcontextprotocol/server";
import { z } from 'zod';
import { api } from '../client';

export function registerAcceptDrillImprovement(server: McpServer) {
  server.registerTool(
    'accept_drill_improvement',
    {
      description:
        'Accept a proposed drill improvement. A risk candidate becomes a risk. A knowledge draft is not approved here; approve it from the knowledge review queue.',
      inputSchema: z.object({
        improvementId: z.string().uuid().describe('The UUID of the improvement item'),
      }),
    },
    async (input) => {
      try {
        const data = await api.acceptDrillImprovement(input.improvementId);
        return { content: [{ type: 'text' as const, text: JSON.stringify(data, null, 2) }] };
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
        return {
          content: [
            { type: 'text' as const, text: `Error accepting drill improvement: ${errorMessage}` },
          ],
          isError: true,
        };
      }
    },
  );
}
