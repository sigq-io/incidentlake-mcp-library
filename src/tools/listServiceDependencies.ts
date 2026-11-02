import { McpServer } from "@modelcontextprotocol/server";
import { z } from 'zod';
import { api } from '../client';

export function registerListServiceDependencies(server: McpServer) {
  server.registerTool(
    'list_service_dependencies',
    {
      description:
        'List what a CMDB service depends on — the outgoing edges of the service graph (parent depends on child).',
      inputSchema: z.object({
        serviceId: z.string().uuid().describe('The UUID of the service'),
      }),
    },
    async (input) => {
      try {
        const data = await api.listServiceDependencies(input.serviceId);
        return { content: [{ type: 'text' as const, text: JSON.stringify(data, null, 2) }] };
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
        return {
          content: [
            { type: 'text' as const, text: `Error listing service dependencies: ${errorMessage}` },
          ],
          isError: true,
        };
      }
    },
  );
}
