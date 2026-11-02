import { McpServer } from "@modelcontextprotocol/server";
import { z } from 'zod';
import { api } from '../client';
import { zDrillLanguage } from '../drillZod';
import type { JsonObject } from '../types';

export function registerCreateDrillScenarioFromCatalog(server: McpServer) {
  server.registerTool(
    'create_drill_scenario_from_catalog',
    {
      description:
        'Copy a catalog drill scenario into this tenant. Use list_drill_catalog to get a catalogKey. The copy starts as a draft.',
      inputSchema: z.object({
        catalogKey: z
          .string()
          .min(1)
          .describe('Catalog scenario key from list_drill_catalog, such as generic.common.weekday-hq-earthquake'),
        language: zDrillLanguage,
        businessType: z
          .string()
          .nullable()
          .optional()
          .describe('Business type key to stamp on the copy. Null leaves it unset.'),
      }),
    },
    async (input) => {
      try {
        const body: JsonObject = { catalogKey: input.catalogKey };
        if (input.language !== undefined) body.language = input.language;
        if (input.businessType !== undefined) body.businessType = input.businessType;
        const data = await api.createDrillScenarioFromCatalog(body);
        return { content: [{ type: 'text' as const, text: JSON.stringify(data, null, 2) }] };
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
        return {
          content: [
            { type: 'text' as const, text: `Error copying catalog drill scenario: ${errorMessage}` },
          ],
          isError: true,
        };
      }
    },
  );
}
