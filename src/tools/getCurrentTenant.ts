import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { api } from '../client';

export function registerGetCurrentTenant(server: McpServer) {
  server.registerTool(
    'get_current_tenant',
    {
      description:
        'Get the tenant the presented API token is bound to (GET /v1/me). A successful response means the token is valid and the API add-on is enabled.',
      inputSchema: z.object({}),
    },
    async () => {
      try {
        const data = await api.getCurrentTenant();
        return { content: [{ type: 'text' as const, text: JSON.stringify(data, null, 2) }] };
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
        return {
          content: [{ type: 'text' as const, text: `Error fetching current tenant: ${errorMessage}` }],
          isError: true,
        };
      }
    },
  );
}
