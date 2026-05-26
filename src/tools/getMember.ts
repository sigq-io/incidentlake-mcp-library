import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { api } from '../client';

export function registerGetMember(server: McpServer) {
  server.registerTool(
    'get_member',
    {
      description: 'Get a single active tenant member by their UUID.',
      inputSchema: z.object({
        memberId: z.string().uuid().describe('The UUID of the tenant member'),
      }),
    },
    async (input) => {
      try {
        const data = await api.getMember(input.memberId);
        return { content: [{ type: 'text' as const, text: JSON.stringify(data, null, 2) }] };
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
        return {
          content: [{ type: 'text' as const, text: `Error getting member: ${errorMessage}` }],
          isError: true,
        };
      }
    },
  );
}
