import { McpServer } from "@modelcontextprotocol/server";
import { z } from 'zod';
import { api } from '../client';

export function registerInjectDrillWildcard(server: McpServer) {
  server.registerTool(
    'inject_drill_wildcard',
    {
      description:
        'Play an unexpected turn (wildcard) from the scenario. Controllers only. index is the wildcard position in the scenario, starting at 0. Fails if it was already played or the drill is not running.',
      inputSchema: z.object({
        sessionId: z.string().uuid().describe('The UUID of the drill session'),
        index: z.number().int().min(0).describe('Zero-based index into the scenario wildcards'),
      }),
    },
    async (input) => {
      try {
        const data = await api.injectDrillWildcard(input.sessionId, input.index);
        return { content: [{ type: 'text' as const, text: JSON.stringify(data, null, 2) }] };
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
        return {
          content: [{ type: 'text' as const, text: `Error playing drill wildcard: ${errorMessage}` }],
          isError: true,
        };
      }
    },
  );
}
