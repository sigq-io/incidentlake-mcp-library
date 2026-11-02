import { McpServer } from "@modelcontextprotocol/server";
import { z } from 'zod';
import { api } from '../client';
import { optionalNonEmptyStringArraySchema } from '../coerceArrays';
import { zIncludeDrills } from '../incidentZod';
import { INCIDENT_CATEGORIES, type IncidentCategory } from '../types';

type SearchIncidentsInput = {
  query: string;
  limit?: number;
  tags?: string[];
  category?: IncidentCategory[];
  includeDrills?: boolean;
};

export function registerSearchIncidents(server: McpServer) {
  server.registerTool(
    'search_incidents',
    {
      description:
        'Search incidents by keyword. Matches against incident name, status, and declare source. Use this when the user wants to find incidents by descriptive text.',
      inputSchema: z.object({
        query: z.string().min(1).max(500).describe('Search keyword or phrase'),
        limit: z
          .number()
          .int()
          .min(1)
          .max(100)
          .optional()
          .describe('Maximum number of results to return (default: 10)'),
        tags: optionalNonEmptyStringArraySchema.describe(
          'Optional categorization tags AND filter (must match all); array or comma-separated string.',
        ),
        category: z
          .array(z.enum(INCIDENT_CATEGORIES))
          .optional()
          .describe('Category filter (system, security, operational). Match any listed value.'),
        includeDrills: zIncludeDrills,
      }),
    },
    async (input: SearchIncidentsInput) => {
      try {
        const data = await api.searchIncidents(input.query, input.limit, input.tags, {
          category: input.category,
          includeDrills: input.includeDrills,
        });
        return { content: [{ type: 'text' as const, text: JSON.stringify(data, null, 2) }] };
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
        return {
          content: [{ type: 'text' as const, text: `Error searching incidents: ${errorMessage}` }],
          isError: true,
        };
      }
    },
  );
}
