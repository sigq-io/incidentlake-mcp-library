import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { api } from '../client';
import type { JsonObject } from '../types';

export function registerCreateRisk(server: McpServer) {
  server.registerTool(
    'create_risk',
    {
      description: 'Create a new risk in the risk map.',
      inputSchema: z.object({
        title: z.string().min(1).describe('Risk title (required)'),
        description: z.string().optional().describe('Detailed description of the risk'),
        category: z
          .enum(['code', 'infrastructure', 'dependency', 'business', 'operational'])
          .optional()
          .describe('Risk category'),
        severity: z
          .enum(['critical', 'high', 'medium', 'low', 'informational'])
          .optional()
          .describe('Risk severity'),
        status: z
          .enum(['open', 'acknowledged', 'in_remediation', 'resolved', 'accepted', 'duplicate'])
          .optional()
          .describe('Initial status (default: open)'),
        serviceId: z
          .string()
          .uuid()
          .optional()
          .describe('UUID of the CMDB service this risk belongs to'),
        location: z.string().optional().describe('Location or component where the risk exists'),
      }),
    },
    async (input) => {
      try {
        const body: JsonObject = { title: input.title };
        if (input.description) body.description = input.description;
        if (input.category) body.category = input.category;
        if (input.severity) body.severity = input.severity;
        if (input.status) body.status = input.status;
        if (input.serviceId) body.serviceId = input.serviceId;
        if (input.location) body.location = input.location;
        const data = await api.createRisk(body);
        return { content: [{ type: 'text' as const, text: JSON.stringify(data, null, 2) }] };
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
        return {
          content: [{ type: 'text' as const, text: `Error creating risk: ${errorMessage}` }],
          isError: true,
        };
      }
    },
  );
}
