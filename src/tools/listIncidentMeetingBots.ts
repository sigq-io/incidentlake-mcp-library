import { McpServer } from "@modelcontextprotocol/server";
import { z } from 'zod';
import { api } from '../client';
import { zIncludeDrills } from '../incidentZod';

export function registerListIncidentMeetingBots(server: McpServer) {
  server.registerTool(
    'list_incident_meeting_bots',
    {
      description:
        "List every meeting bot session sent to this incident's meetings, newest first, with status and the latest summary. Requires the meeting bot feature to be enabled for the tenant.",
      inputSchema: z.object({
        incidentId: z.string().uuid().describe('The UUID of the incident'),
        includeDrills: zIncludeDrills,
      }),
    },
    async (input) => {
      try {
        const data = await api.listIncidentMeetingBots(input.incidentId, { includeDrills: input.includeDrills });
        return { content: [{ type: 'text' as const, text: JSON.stringify(data, null, 2) }] };
      } catch (error) {
        const msg = error instanceof Error ? error.message : 'Unknown error occurred';
        return {
          content: [{ type: 'text' as const, text: `Error listing meeting bots: ${msg}` }],
          isError: true,
        };
      }
    },
  );
}
