import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { api } from '../client';

export function registerDeleteService(server: McpServer) {
  server.registerTool(
    'delete_service',
    {
      description: 'Delete a CMDB service by ID.',
      inputSchema: z.object({
        serviceId: z.string().uuid().describe('The UUID of the service to delete'),
      }),
    },
    async (input) => {
      try {
        const data = await api.deleteService(input.serviceId);
        return { content: [{ type: 'text' as const, text: JSON.stringify(data, null, 2) }] };
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
        return {
          content: [{ type: 'text' as const, text: `Error deleting service: ${errorMessage}` }],
          isError: true,
        };
      }
    },
  );
}
