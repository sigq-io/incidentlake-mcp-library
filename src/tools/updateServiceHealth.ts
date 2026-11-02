import { McpServer } from "@modelcontextprotocol/server";
import { z } from 'zod';
import { api } from '../client';

const OPERATIONAL_HEALTH = ['operational', 'degraded', 'outage', 'unknown'] as const;

export function registerUpdateServiceHealth(server: McpServer) {
  server.registerTool(
    'update_service_health',
    {
      description:
        'Manually override a CMDB service operational health (PATCH /v1/services/{serviceId}/health). ' +
        'Use when automated health signals are unavailable or need correction during an incident.',
      inputSchema: z.object({
        serviceId: z.string().uuid().describe('The UUID of the service to update'),
        health: z
          .enum(OPERATIONAL_HEALTH)
          .describe('Operational health: operational, degraded, outage, or unknown'),
      }),
    },
    async (input) => {
      try {
        const data = await api.updateServiceHealth(input.serviceId, input.health);
        return { content: [{ type: 'text' as const, text: JSON.stringify(data, null, 2) }] };
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
        return {
          content: [{ type: 'text' as const, text: `Error updating service health: ${errorMessage}` }],
          isError: true,
        };
      }
    },
  );
}
