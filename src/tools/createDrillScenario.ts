import { McpServer } from "@modelcontextprotocol/server";
import { z } from 'zod';
import { api } from '../client';
import { toJsonObject, zDrillScenarioContent } from '../drillZod';

export function registerCreateDrillScenario(server: McpServer) {
  server.registerTool(
    'create_drill_scenario',
    {
      description:
        'Create a drill scenario from scenario content (title, industry, hazard, exercise type, injects, and the rest of the scenario body). The scenario starts as a draft. The API rejects content whose condition kind does not fit the hazard.',
      inputSchema: z.object({
        scenario: zDrillScenarioContent,
      }),
    },
    async (input) => {
      try {
        const data = await api.createDrillScenario({ scenario: toJsonObject(input.scenario) });
        return { content: [{ type: 'text' as const, text: JSON.stringify(data, null, 2) }] };
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
        return {
          content: [{ type: 'text' as const, text: `Error creating drill scenario: ${errorMessage}` }],
          isError: true,
        };
      }
    },
  );
}
