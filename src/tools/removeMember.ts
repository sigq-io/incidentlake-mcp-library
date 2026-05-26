import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { api } from '../client';

export function registerRemoveMember(server: McpServer) {
  server.registerTool(
    'remove_member',
    {
      description:
        'Remove (soft-delete) a tenant member. The API token must belong to an admin. Cannot remove the last active member or the last admin.',
      inputSchema: z.object({
        memberId: z.string().uuid().describe('The UUID of the member to remove'),
      }),
    },
    async (input) => {
      try {
        const data = await api.removeMember(input.memberId);
        return { content: [{ type: 'text' as const, text: JSON.stringify(data, null, 2) }] };
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
        return {
          content: [{ type: 'text' as const, text: `Error removing member: ${errorMessage}` }],
          isError: true,
        };
      }
    },
  );
}
