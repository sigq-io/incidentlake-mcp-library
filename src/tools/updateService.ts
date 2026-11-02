import { McpServer } from "@modelcontextprotocol/server";
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
        serviceType: z
          .enum(['internal', 'external', 'cloud'])
          .nullable()
          .optional()
          .describe(
            'Updated service type (null to clear). Blocked with 409 if the change would invalidate existing dependencies (External/Cloud cannot depend on internal).',
          ),
        protectionLevel: z
          .number()
          .int()
          .min(1)
          .max(5)
          .optional()
          .describe('Updated protection level (1=highest, 5=lowest)'),
        description: z
          .string()
          .nullable()
          .optional()
          .describe('Updated free-text description (null or empty string to clear)'),
        tags: z.array(z.string()).optional().describe('Updated tags (replaces existing)'),
      }),
    },
    async (input) => {
      try {
        const body: JsonObject = {};
        if (input.name !== undefined) body.name = input.name;
        if (input.serviceType !== undefined) body.serviceType = input.serviceType;
        if (input.protectionLevel !== undefined) body.protectionLevel = input.protectionLevel;
        if (input.description !== undefined) body.description = input.description;
        if (input.tags !== undefined) body.tags = input.tags;
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
