import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { api } from '../client';

export function registerGetIncident(server: McpServer) {
  server.registerTool(
    'get_incident',
    {
      description:
        'Get the full details of a specific incident including its summary, timeline, postmortem, tasks, notes, war rooms, and linked services. Use this when you need deep context about a particular incident.',
      inputSchema: z.object({
        incidentId: z.string().uuid().describe('The UUID of the incident to fetch'),
      }),
    },
    async (input) => {
      const data = await api.getIncident(input.incidentId);
      return { content: [{ type: 'text' as const, text: JSON.stringify(data, null, 2) }] };
    },
  );
}
