import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { api } from '../client';

export function registerGetRisk(server: McpServer) {
  server.registerTool(
    'get_risk',
    {
      description: 'Get a risk by ID.',
      inputSchema: z.object({
        riskId: z.string().uuid().describe('The UUID of the risk'),
      }),
    },
    async (input) => {
      try {
        const data = await api.getRisk(input.riskId);
        return { content: [{ type: 'text' as const, text: JSON.stringify(data, null, 2) }] };
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
        return {
          content: [{ type: 'text' as const, text: `Error getting risk: ${errorMessage}` }],
          isError: true,
        };
      }
    },
  );
}
