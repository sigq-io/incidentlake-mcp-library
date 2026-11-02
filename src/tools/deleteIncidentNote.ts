import { McpServer } from "@modelcontextprotocol/server";
import { z } from 'zod';
import { api } from '../client';
import { zIncludeDrills } from '../incidentZod';

export function registerDeleteIncidentNote(server: McpServer) {
  server.registerTool(
    'delete_incident_note',
    {
      description: 'Delete a note from an incident.',
      inputSchema: z.object({
        incidentId: z.string().uuid().describe('The UUID of the incident'),
        includeDrills: zIncludeDrills,
        noteId: z.string().uuid().describe('The UUID of the note to delete'),
      }),
    },
    async (input) => {
      try {
        const data = await api.deleteIncidentNote(input.incidentId, input.noteId, { includeDrills: input.includeDrills });
        return { content: [{ type: 'text' as const, text: JSON.stringify(data, null, 2) }] };
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
        return {
          content: [{ type: 'text' as const, text: `Error deleting incident note: ${errorMessage}` }],
          isError: true,
        };
      }
    },
  );
}
