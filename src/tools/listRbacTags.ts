import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { api } from '../client';

export function registerListRbacTags(server: McpServer) {
  server.registerTool(
    'list_rbac_tags',
    {
      description:
        'List all RBAC tags defined for the tenant (GET /v1/rbac-tags). Returns id, name, and description for each tag. Use the id values in rbacTagIds when creating or updating incidents.',
      inputSchema: {},
    },
    async () => {
      try {
        const data = await api.listRbacTags();
        return { content: [{ type: 'text' as const, text: JSON.stringify(data, null, 2) }] };
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
        return {
          content: [{ type: 'text' as const, text: `Error listing RBAC tags: ${errorMessage}` }],
          isError: true,
        };
      }
    },
  );
}
