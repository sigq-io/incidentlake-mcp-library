import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { api } from '../client';

type AddIncidentNoteInput = {
  incidentId: string;
  content: string;
  createdBy?: string;
};

const inputSchema = z.object({
  incidentId: z.string().uuid().describe('The UUID of the incident to add the note to'),
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
}) as z.ZodType<AddIncidentNoteInput>;

export function registerAddIncidentNote(server: McpServer) {
  server.registerTool(
    'add_incident_note',
    {
      description:
        'Add a note to an existing incident. Use this when a user wants to log an update, observation, error log, or any text information against a specific incident.',
      inputSchema,
    },
    async (input) => {
      const body: Record<string, unknown> = { content: input.content };
      if (input.createdBy) body.createdBy = input.createdBy;

      const data = await api.addIncidentNote(input.incidentId, body);
      return { content: [{ type: 'text' as const, text: JSON.stringify(data, null, 2) }] };
    },
  );
}
