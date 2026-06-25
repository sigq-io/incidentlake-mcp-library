import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { api } from '../client';
import type { JsonObject } from '../types';

export function registerUpdateService(server: McpServer) {
  server.registerTool(
    'update_service',
    {
      description: 'Update an existing CMDB service.',
      inputSchema: z.object({
        serviceId: z.string().uuid().describe('The UUID of the service to update'),
        name: z.string().min(1).optional().describe('Updated service name'),
        protectionLevel: z
          .number()
          .int()
          .min(1)
          .max(5)
          .optional()
          .describe('Updated protection level (1=highest, 5=lowest)'),
        serviceType: z
          .enum(['internal', 'external', 'cloud'])
          .nullable()
          .optional()
          .describe('Updated service type (null to clear)'),
        lifecycleState: z
          .enum(['planning', 'operating', 'retired'])
          .optional()
          .describe('Updated lifecycle state'),
        tags: z.array(z.string()).optional().describe('Updated tags (replaces existing)'),
        customerNames: z
          .array(z.string())
          .optional()
          .describe('Updated customer names (replaces existing)'),
        sla: z.number().nullable().optional().describe('Updated SLA target (null to clear)'),
      }),
    },
    async (input) => {
      try {
        const body: JsonObject = {};
        if (input.name !== undefined) body.name = input.name;
        if (input.protectionLevel !== undefined) body.protectionLevel = input.protectionLevel;
        if (input.serviceType !== undefined) body.serviceType = input.serviceType;
        if (input.lifecycleState !== undefined) body.lifecycleState = input.lifecycleState;
        if (input.tags !== undefined) body.tags = input.tags;
        if (input.customerNames !== undefined) body.customerNames = input.customerNames;
        if (input.sla !== undefined) body.sla = input.sla;
        const data = await api.updateService(input.serviceId, body);
        return { content: [{ type: 'text' as const, text: JSON.stringify(data, null, 2) }] };
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
        return {
          content: [{ type: 'text' as const, text: `Error updating service: ${errorMessage}` }],
          isError: true,
        };
      }
    },
  );
}
