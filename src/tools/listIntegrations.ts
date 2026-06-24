import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { api } from '../client';

export function registerListIntegrations(server: McpServer) {
  server.registerTool(
    'list_integrations',
    {
      description:
        'List all integrations configured for the tenant (Slack, Jira, Notion, Google Drive, etc.).',
      inputSchema: z.object({}),
    },
    async (_input) => {
      try {
        const data = await api.listIntegrations();
        return { content: [{ type: 'text' as const, text: JSON.stringify(data, null, 2) }] };
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
        return {
          content: [{ type: 'text' as const, text: `Error listing integrations: ${errorMessage}` }],
          isError: true,
        };
      }
    },
  );
}
