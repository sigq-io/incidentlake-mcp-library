import { McpServer } from "@modelcontextprotocol/server";
import { z } from 'zod';
import { api } from '../client';

export function registerListServiceDependencyEdges(server: McpServer) {
  server.registerTool(
    'list_service_dependency_edges',
    {
      description: 'List every dependency edge in the tenant CMDB graph.',
      inputSchema: z.object({}),
    },
    async () => {
      try {
        const data = await api.listServiceDependencyEdges();
        return { content: [{ type: 'text' as const, text: JSON.stringify(data, null, 2) }] };
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
        return {
          content: [
            { type: 'text' as const, text: `Error listing service dependency edges: ${errorMessage}` },
          ],
          isError: true,
        };
      }
    },
  );
}
