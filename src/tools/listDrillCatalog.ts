import { McpServer } from "@modelcontextprotocol/server";
import { z } from 'zod';
import { api } from '../client';
import { DRILL_EXERCISE_TYPES, DRILL_HAZARDS, DRILL_INDUSTRIES } from '../types';

export function registerListDrillCatalog(server: McpServer) {
  server.registerTool(
    'list_drill_catalog',
    {
      description:
        'List ready-made drill scenarios that can be copied with create_drill_scenario_from_catalog. Filter by industry, business type, hazard, or exercise type.',
      inputSchema: z.object({
        industry: z.enum(DRILL_INDUSTRIES).optional().describe('Filter by industry'),
        businessType: z.string().optional().describe('Filter by business type key'),
        hazard: z.enum(DRILL_HAZARDS).optional().describe('Filter by hazard'),
        exerciseType: z.enum(DRILL_EXERCISE_TYPES).optional().describe('Filter by exercise type'),
      }),
    },
    async (input) => {
      try {
        const params = new URLSearchParams();
        if (input.industry) params.set('industry', input.industry);
        if (input.businessType) params.set('businessType', input.businessType);
        if (input.hazard) params.set('hazard', input.hazard);
        if (input.exerciseType) params.set('exerciseType', input.exerciseType);
        const data = await api.listDrillCatalog(params.size ? params : undefined);
        return { content: [{ type: 'text' as const, text: JSON.stringify(data, null, 2) }] };
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
        return {
          content: [{ type: 'text' as const, text: `Error listing drill catalog: ${errorMessage}` }],
          isError: true,
        };
      }
    },
  );
}
