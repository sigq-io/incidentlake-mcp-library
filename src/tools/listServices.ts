import { McpServer } from "@modelcontextprotocol/server";
import { z } from 'zod';
import { api } from '../client';

export function registerListServices(server: McpServer) {
  server.registerTool(
    'list_services',
    {
      description:
        'List CMDB services. Defaults to active services (planning + operating). Optionally filter by lifecycleState.',
      inputSchema: z.object({
        lifecycleState: z
          .enum(['planning', 'operating', 'retired'])
          .optional()
          .describe('Filter by lifecycle state (default: planning + operating)'),
        name: z
          .string()
          .min(1)
          .optional()
          .describe('Exact service name, case-insensitive'),
      }),
    },
    async (input) => {
      try {
        const params = new URLSearchParams();
        if (input.lifecycleState) params.set('lifecycleState', input.lifecycleState);
        if (input.name) params.set('name', input.name);
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
