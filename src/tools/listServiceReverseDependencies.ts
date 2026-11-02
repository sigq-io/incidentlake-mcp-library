import { McpServer } from "@modelcontextprotocol/server";
import { z } from 'zod';
import { api } from '../client';

export function registerListServiceReverseDependencies(server: McpServer) {
  server.registerTool(
    'list_service_reverse_dependencies',
    {
      description:
        'List what depends on a CMDB service — the incoming edges of the service graph (services that depend on this one).',
      inputSchema: z.object({
        serviceId: z.string().uuid().describe('The UUID of the service'),
      }),
    },
    async (input) => {
      try {
        const data = await api.listServiceReverseDependencies(input.serviceId);
        return { content: [{ type: 'text' as const, text: JSON.stringify(data, null, 2) }] };
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
        return {
          content: [
            {
              type: 'text' as const,
              text: `Error listing service reverse dependencies: ${errorMessage}`,
            },
          ],
          isError: true,
        };
      }
    },
  );
}
