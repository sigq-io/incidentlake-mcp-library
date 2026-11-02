import { McpServer } from "@modelcontextprotocol/server";
import { z } from 'zod';
import { api } from '../client';

export function registerDismissDrillImprovement(server: McpServer) {
  server.registerTool(
    'dismiss_drill_improvement',
    {
      description:
        'Dismiss a proposed drill improvement. Dismissing a knowledge draft also dismisses that draft.',
      inputSchema: z.object({
        improvementId: z.string().uuid().describe('The UUID of the improvement item'),
      }),
    },
    async (input) => {
      try {
        const data = await api.dismissDrillImprovement(input.improvementId);
        return { content: [{ type: 'text' as const, text: JSON.stringify(data, null, 2) }] };
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
        return {
          content: [
            { type: 'text' as const, text: `Error dismissing drill improvement: ${errorMessage}` },
          ],
          isError: true,
        };
      }
    },
  );
}
