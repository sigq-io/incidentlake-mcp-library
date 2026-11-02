import { McpServer } from "@modelcontextprotocol/server";
import { z } from 'zod';
import { api } from '../client';

export function registerGenerateDrillDebrief(server: McpServer) {
  server.registerTool(
    'generate_drill_debrief',
    {
      description:
        'Generate the AI debrief of a finished drill and propose improvements. Uses LLM quota. The session must be completed. Regenerating replaces pending improvement items; accepted and dismissed items stay.',
      inputSchema: z.object({
        sessionId: z.string().uuid().describe('The UUID of the completed drill session'),
      }),
    },
    async (input) => {
      try {
        const data = await api.generateDrillDebrief(input.sessionId);
        return { content: [{ type: 'text' as const, text: JSON.stringify(data, null, 2) }] };
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
        return {
          content: [{ type: 'text' as const, text: `Error generating drill debrief: ${errorMessage}` }],
          isError: true,
        };
      }
    },
  );
}
