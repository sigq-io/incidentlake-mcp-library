import { McpServer } from "@modelcontextprotocol/server";
import { z } from 'zod';
import { api } from '../client';

export function registerGetDrillScenario(server: McpServer) {
  server.registerTool(
    'get_drill_scenario',
    {
      description:
        'Get one drill scenario, including its cards. Participants who are not controllers cannot read a scenario whose drill has not finished.',
      inputSchema: z.object({
        scenarioId: z.string().uuid().describe('The UUID of the drill scenario'),
      }),
    },
    async (input) => {
      try {
        const data = await api.getDrillScenario(input.scenarioId);
        return { content: [{ type: 'text' as const, text: JSON.stringify(data, null, 2) }] };
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
        return {
          content: [{ type: 'text' as const, text: `Error fetching drill scenario: ${errorMessage}` }],
          isError: true,
        };
      }
    },
  );
}
