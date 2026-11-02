import { McpServer } from "@modelcontextprotocol/server";
import { z } from 'zod';
import { api } from '../client';

export function registerDeleteDrillScenario(server: McpServer) {
  server.registerTool(
    'delete_drill_scenario',
    {
      description:
        'Delete a drill scenario. Participants who are not controllers cannot delete a scenario whose drill has not finished.',
      inputSchema: z.object({
        scenarioId: z.string().uuid().describe('The UUID of the drill scenario to delete'),
      }),
    },
    async (input) => {
      try {
        const data = await api.deleteDrillScenario(input.scenarioId);
        return { content: [{ type: 'text' as const, text: JSON.stringify(data, null, 2) }] };
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
        return {
          content: [{ type: 'text' as const, text: `Error deleting drill scenario: ${errorMessage}` }],
          isError: true,
        };
      }
    },
  );
}
