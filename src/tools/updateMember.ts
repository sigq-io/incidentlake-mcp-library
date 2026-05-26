import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { api } from '../client';

export function registerUpdateMember(server: McpServer) {
  server.registerTool(
    'update_member',
    {
      description:
        "Update a tenant member's role (authority). The API token must belong to an admin. Valid roles: admin, member, viewer.",
      inputSchema: z.object({
        memberId: z.string().uuid().describe('The UUID of the member to update'),
        authority: z
          .enum(['admin', 'member', 'viewer'])
          .describe('New role for the member'),
      }),
    },
    async (input) => {
      try {
        const data = await api.updateMember(input.memberId, { authority: input.authority });
        return { content: [{ type: 'text' as const, text: JSON.stringify(data, null, 2) }] };
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
        return {
          content: [{ type: 'text' as const, text: `Error updating member: ${errorMessage}` }],
          isError: true,
        };
      }
    },
  );
}
