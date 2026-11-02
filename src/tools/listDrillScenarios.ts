import { McpServer } from "@modelcontextprotocol/server";
import { z } from 'zod';
import { api } from '../client';
import { zDrillScenarioStatus } from '../drillZod';

export function registerListDrillScenarios(server: McpServer) {
  server.registerTool(
    'list_drill_scenarios',
    {
      description:
        'List drill scenarios. Scenarios of drills that have not finished are withheld from participants who are not controllers, so the answer key stays sealed.',
      inputSchema: z.object({
        status: zDrillScenarioStatus.optional().describe('Filter by draft, approved, or archived'),
      }),
    },
    async (input) => {
      try {
        const params = new URLSearchParams();
        if (input.status) params.set('status', input.status);
        const data = await api.listDrillScenarios(params.size ? params : undefined);
        return { content: [{ type: 'text' as const, text: JSON.stringify(data, null, 2) }] };
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
        return {
          content: [{ type: 'text' as const, text: `Error listing drill scenarios: ${errorMessage}` }],
          isError: true,
        };
      }
    },
  );
}
