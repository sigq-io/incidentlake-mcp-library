import { McpServer } from "@modelcontextprotocol/server";
import { z } from 'zod';
import { api } from '../client';
import { zIncludeDrills } from '../incidentZod';

export function registerUpdateIncidentNote(server: McpServer) {
  server.registerTool(
    'update_incident_note',
    {
      description: 'Update the content of an existing incident note.',
      inputSchema: z.object({
        incidentId: z.string().uuid().describe('The UUID of the incident'),
        includeDrills: zIncludeDrills,
        noteId: z.string().uuid().describe('The UUID of the note to update'),
        content: z.string().min(1).describe('New note content (must be non-empty)'),
      }),
    },
    async (input) => {
      try {
        const data = await api.updateIncidentNote(
          input.incidentId,
          input.noteId,
          { content: input.content },
          { includeDrills: input.includeDrills },
        );
        return { content: [{ type: 'text' as const, text: JSON.stringify(data, null, 2) }] };
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
        return {
          content: [{ type: 'text' as const, text: `Error updating incident note: ${errorMessage}` }],
          isError: true,
        };
      }
    },
  );
}
