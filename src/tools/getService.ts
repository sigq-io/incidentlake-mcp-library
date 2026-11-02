import { McpServer } from "@modelcontextprotocol/server";
import { z } from 'zod';
import { api } from '../client';

export function registerGetService(server: McpServer) {
  server.registerTool(
    'get_service',
    {
      description: 'Get a CMDB service by ID.',
      inputSchema: z.object({
        serviceId: z.string().uuid().describe('The UUID of the service'),
        includeRetired: z
          .boolean()
          .optional()
          .describe('Set true to return a retired service. Omit to keep the default 404 for retired services.'),
      }),
    },
    async (input) => {
      try {
        const data = await api.getService(input.serviceId, input.includeRetired);
        return { content: [{ type: 'text' as const, text: JSON.stringify(data, null, 2) }] };
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
        return {
          content: [{ type: 'text' as const, text: `Error getting service: ${errorMessage}` }],
          isError: true,
        };
      }
    },
  );
}
