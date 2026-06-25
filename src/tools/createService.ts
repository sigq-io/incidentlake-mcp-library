import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { api } from '../client';
import type { JsonObject } from '../types';

export function registerCreateService(server: McpServer) {
  server.registerTool(
    'create_service',
    {
      description:
        'Create a new CMDB service. protectionLevel is required (1=highest, 5=lowest).',
      inputSchema: z.object({
        name: z.string().min(1).describe('Service name'),
        protectionLevel: z
          .number()
          .int()
          .min(1)
          .max(5)
          .describe('Protection level 1 (highest criticality) to 5 (lowest)'),
        serviceType: z
          .enum(['internal', 'external', 'cloud'])
          .optional()
          .describe('Type of service'),
        lifecycleState: z
          .enum(['planning', 'operating', 'retired'])
          .optional()
          .describe('Lifecycle state (default: operating)'),
        tags: z.array(z.string()).optional().describe('Categorization tags'),
        customerNames: z
          .array(z.string())
          .optional()
          .describe('Customer names that use this service'),
        sla: z.number().optional().describe('SLA target as a percentage (e.g. 99.9)'),
      }),
    },
    async (input) => {
      try {
        const body: JsonObject = { name: input.name, protectionLevel: input.protectionLevel };
        if (input.serviceType) body.serviceType = input.serviceType;
        if (input.lifecycleState) body.lifecycleState = input.lifecycleState;
        if (input.tags) body.tags = input.tags;
        if (input.customerNames) body.customerNames = input.customerNames;
        if (input.sla !== undefined) body.sla = input.sla;
        const data = await api.createService(body);
        return { content: [{ type: 'text' as const, text: JSON.stringify(data, null, 2) }] };
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
        return {
          content: [{ type: 'text' as const, text: `Error creating service: ${errorMessage}` }],
          isError: true,
        };
      }
    },
  );
}
