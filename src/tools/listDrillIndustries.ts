import { McpServer } from "@modelcontextprotocol/server";
import { z } from 'zod';
import { api } from '../client';

export function registerListDrillIndustries(server: McpServer) {
  server.registerTool(
    'list_drill_industries',
    {
      description:
        'List drill industry profiles: industries, business types, and the regulations a drill for each should consider. Requires the drills plan feature.',
      inputSchema: z.object({}),
    },
    async () => {
      try {
        const data = await api.listDrillIndustries();
        return { content: [{ type: 'text' as const, text: JSON.stringify(data, null, 2) }] };
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
        return {
          content: [{ type: 'text' as const, text: `Error listing drill industries: ${errorMessage}` }],
          isError: true,
        };
      }
    },
  );
}
