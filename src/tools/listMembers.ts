import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { api } from '../client';

export function registerListMembers(server: McpServer) {
  server.registerTool(
    'list_members',
    {
      description:
        'List active tenant members (GET /v1/members). Use to resolve emails for assigneeEmails on create/update incident.',
      inputSchema: z.object({}),
    },
    async () => {
      try {
        const data = await api.listMembers();
        return { content: [{ type: 'text' as const, text: JSON.stringify(data, null, 2) }] };
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
        return {
          content: [{ type: 'text' as const, text: `Error listing members: ${errorMessage}` }],
          isError: true,
        };
      }
    },
  );
}
