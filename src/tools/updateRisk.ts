import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { api } from '../client';
import type { JsonObject } from '../types';

export function registerUpdateRisk(server: McpServer) {
  server.registerTool(
    'update_risk',
    {
      description: 'Update an existing risk.',
      inputSchema: z.object({
        riskId: z.string().uuid().describe('The UUID of the risk to update'),
        title: z.string().min(1).optional().describe('Updated title'),
        description: z
          .string()
          .nullable()
          .optional()
          .describe('Updated description (null to clear)'),
        category: z
          .enum(['code', 'infrastructure', 'dependency', 'business', 'operational'])
          .nullable()
          .optional()
          .describe('Updated category (null to clear)'),
        severity: z
          .enum(['critical', 'high', 'medium', 'low', 'informational'])
          .nullable()
          .optional()
          .describe('Updated severity (null to clear)'),
        status: z
          .enum(['open', 'acknowledged', 'in_remediation', 'resolved', 'accepted', 'duplicate'])
          .optional()
          .describe('Updated status'),
        serviceId: z
          .string()
          .uuid()
          .nullable()
          .optional()
          .describe('Updated linked service UUID (null to clear)'),
        location: z.string().nullable().optional().describe('Updated location or component (null to clear)'),
      }),
    },
    async (input) => {
      try {
        const body: JsonObject = {};
        if (input.title !== undefined) body.title = input.title;
        if (input.description !== undefined) body.description = input.description;
        if (input.category !== undefined) body.category = input.category;
        if (input.severity !== undefined) body.severity = input.severity;
        if (input.status !== undefined) body.status = input.status;
        if (input.serviceId !== undefined) body.serviceId = input.serviceId;
        if (input.location !== undefined) body.location = input.location;
        const data = await api.updateRisk(input.riskId, body);
        return { content: [{ type: 'text' as const, text: JSON.stringify(data, null, 2) }] };
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
        return {
          content: [{ type: 'text' as const, text: `Error updating risk: ${errorMessage}` }],
          isError: true,
        };
      }
    },
  );
}
