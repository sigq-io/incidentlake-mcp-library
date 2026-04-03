import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { api } from '../client';

export function registerGetSopCompletions(server: McpServer) {
  server.registerTool(
    'get_sop_completions',
    {
      description:
        'Get the SOP (Standard Operating Procedure) checklist completion status for an incident. Shows which response steps have been completed and which are still pending.',
      inputSchema: z.object({
        incidentId: z.string().uuid().describe('The UUID of the incident'),
      }),
    },
    async (input) => {
      const data = await api.getSopCompletions(input.incidentId);
      return { content: [{ type: 'text' as const, text: JSON.stringify(data, null, 2) }] };
    },
  );
}
