import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { api } from '../client';

export function registerGetAnalytics(server: McpServer) {
  server.registerTool(
    'get_incident_analytics',
    {
      description:
        'Get analytics for incidents within a date range. Returns incidents with severity, task completion counts, and status data for the period. Useful for reporting, trend analysis, and operational reviews.',
      inputSchema: z.object({
        startDate: z
          .string()
          .regex(/^\d{4}-\d{2}-\d{2}$/, 'Must be in YYYY-MM-DD format')
          .describe('Start date in YYYY-MM-DD format (inclusive)'),
        endDate: z
          .string()
          .regex(/^\d{4}-\d{2}-\d{2}$/, 'Must be in YYYY-MM-DD format')
          .describe('End date in YYYY-MM-DD format (inclusive)'),
      }),
    },
    async (input) => {
      const data = await api.getAnalytics(input.startDate, input.endDate);
      return { content: [{ type: 'text' as const, text: JSON.stringify(data, null, 2) }] };
    },
  );
}
