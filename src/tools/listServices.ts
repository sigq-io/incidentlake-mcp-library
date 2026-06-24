import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { api } from '../client';

export function registerListServices(server: McpServer) {
  server.registerTool(
    'list_services',
    {
      description:
        'List CMDB services. Defaults to active services (planning + operating). Optionally filter by lifecycleState or customerName.',
      inputSchema: z.object({
        lifecycleState: z
          .enum(['planning', 'operating', 'retired'])
          .optional()
          .describe('Filter by lifecycle state (default: planning + operating)'),
        customerName: z
          .string()
          .optional()
          .describe('Filter services used by this customer name'),
      }),
    },
    async (input) => {
      try {
        const params = new URLSearchParams();
        if (input.lifecycleState) params.set('lifecycleState', input.lifecycleState);
        if (input.customerName) params.set('customerName', input.customerName);
        const data = await api.listServices(params.size ? params : undefined);
        return { content: [{ type: 'text' as const, text: JSON.stringify(data, null, 2) }] };
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
        return {
          content: [{ type: 'text' as const, text: `Error listing services: ${errorMessage}` }],
          isError: true,
        };
      }
    },
  );
}
