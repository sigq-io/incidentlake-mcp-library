import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { api } from '../client';

export function registerListRisks(server: McpServer) {
  server.registerTool(
    'list_risks',
    {
      description:
        'List risks from the risk map. Filter by category, severity, status, linked service, reporter, or location.',
      inputSchema: z.object({
        category: z
          .enum(['code', 'infrastructure', 'dependency', 'business', 'operational'])
          .optional()
          .describe('Filter by risk category'),
        severity: z
          .enum(['critical', 'high', 'medium', 'low', 'informational'])
          .optional()
          .describe('Filter by risk severity'),
        status: z
          .enum(['open', 'acknowledged', 'in_remediation', 'resolved', 'accepted', 'duplicate'])
          .optional()
          .describe('Filter by risk status'),
        serviceId: z.string().uuid().optional().describe('Filter by linked CMDB service UUID'),
        reportedBy: z.string().optional().describe('Filter by reporter name or email'),
        location: z.string().optional().describe('Filter by location or component'),
      }),
    },
    async (input) => {
      try {
        const params = new URLSearchParams();
        if (input.category) params.set('category', input.category);
        if (input.severity) params.set('severity', input.severity);
        if (input.status) params.set('status', input.status);
        if (input.serviceId) params.set('serviceId', input.serviceId);
        if (input.reportedBy) params.set('reportedBy', input.reportedBy);
        if (input.location) params.set('location', input.location);
        const data = await api.listRisks(params.size ? params : undefined);
        return { content: [{ type: 'text' as const, text: JSON.stringify(data, null, 2) }] };
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
        return {
          content: [{ type: 'text' as const, text: `Error listing risks: ${errorMessage}` }],
          isError: true,
        };
      }
    },
  );
}
