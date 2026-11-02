import { McpServer } from "@modelcontextprotocol/server";
import { z } from 'zod';
import { api } from '../client';
import type { JsonObject } from '../types';

export function registerCreateService(server: McpServer) {
  server.registerTool(
    'create_service',
    {
      description: 'Create a new CMDB service.',
      inputSchema: z.object({
        name: z.string().min(1).describe('Service name'),
        serviceType: z
          .enum(['internal', 'external', 'cloud'])
          .optional()
          .describe('Type of service (default: internal)'),
        protectionLevel: z
          .number()
          .int()
          .min(1)
          .max(5)
          .optional()
          .describe('Protection level 1 (highest criticality) to 5 (lowest); defaults to 3 if omitted'),
        description: z.string().optional().describe('Free-text description of the service'),
        tags: z.array(z.string()).optional().describe('Categorization tags'),
      }),
    },
    async (input) => {
      try {
        const body: JsonObject = { name: input.name };
        if (input.serviceType) body.serviceType = input.serviceType;
        if (input.protectionLevel !== undefined) body.protectionLevel = input.protectionLevel;
        if (input.description !== undefined) body.description = input.description;
        if (input.tags) body.tags = input.tags;
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
