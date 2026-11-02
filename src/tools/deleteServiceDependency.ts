import { McpServer } from "@modelcontextprotocol/server";
import { z } from 'zod';
import { api } from '../client';

export function registerDeleteServiceDependency(server: McpServer) {
  server.registerTool(
    'delete_service_dependency',
    {
      description: 'Delete a CMDB dependency edge by its numeric ID.',
      inputSchema: z.object({
        dependencyId: z
          .number()
          .int()
          .positive()
          .describe('Numeric edge ID, as returned by the dependency list tools'),
      }),
    },
    async (input) => {
      try {
        const data = await api.deleteServiceDependency(input.dependencyId);
        return { content: [{ type: 'text' as const, text: JSON.stringify(data, null, 2) }] };
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
        return {
          content: [
            { type: 'text' as const, text: `Error deleting service dependency: ${errorMessage}` },
          ],
          isError: true,
        };
      }
    },
  );
}
