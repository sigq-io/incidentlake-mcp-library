import { McpServer } from "@modelcontextprotocol/server";
import { z } from 'zod';
import { api } from '../client';
import { zIncludeDrills } from '../incidentZod';
import type { JsonObject } from '../types';

const inputSchema = z.object({
  incidentId: z.string().uuid().describe('The UUID of the incident to add the note to'),
  includeDrills: zIncludeDrills,
  content: z
    .string()
    .min(1)
    .describe(
      'Note content to add to the incident. Accepts plain text including multi-line error logs, stack traces, or any structured text.',
    ),
  createdBy: z
    .string()
    .uuid()
    .optional()
    .describe(
      'Optional tenant member UUID to attribute the note to. If omitted, the default tenant member is used.',
    ),
});

export function registerAddIncidentNote(server: McpServer) {
  server.registerTool(
    'add_incident_note',
    {
      description:
        'Add a note to an existing incident. Use this when a user wants to log an update, observation, error log, or any text information against a specific incident.',
      inputSchema: z.object(inputSchema.shape),
    },
    async (input) => {
      try {
        const body: JsonObject = { content: input.content };
        if (input.createdBy) body.createdBy = input.createdBy;

        const data = await api.addIncidentNote(input.incidentId, body, { includeDrills: input.includeDrills });
        return { content: [{ type: 'text' as const, text: JSON.stringify(data, null, 2) }] };
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
        return {
          content: [{ type: 'text' as const, text: `Error adding incident note: ${errorMessage}` }],
          isError: true,
        };
      }
    },
  );
}
