import { McpServer } from "@modelcontextprotocol/server";
import { z } from 'zod';
import { api } from '../client';
import { zIncludeDrills } from '../incidentZod';

export function registerDeleteIncidentMeetingBot(server: McpServer) {
  server.registerTool(
    'delete_incident_meeting_bot',
    {
      description:
        "Ask the meeting bot to leave the meeting. The session moves to 'ended' and then 'done' once the final summary is written; a bot that has not joined yet is cancelled. Repeating the call on a finished session is a no-op.",
      inputSchema: z.object({
        incidentId: z.string().uuid().describe('The UUID of the incident'),
        includeDrills: zIncludeDrills,
        sessionId: z.string().uuid().describe('The meeting bot session id (from list_incident_meeting_bots)'),
      }),
    },
    async (input) => {
      try {
        const data = await api.deleteIncidentMeetingBot(input.incidentId, input.sessionId, { includeDrills: input.includeDrills });
        return { content: [{ type: 'text' as const, text: JSON.stringify(data, null, 2) }] };
      } catch (error) {
        const msg = error instanceof Error ? error.message : 'Unknown error occurred';
        return {
          content: [{ type: 'text' as const, text: `Error removing meeting bot: ${msg}` }],
          isError: true,
        };
      }
    },
  );
}
