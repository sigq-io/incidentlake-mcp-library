import { McpServer } from "@modelcontextprotocol/server";
import { z } from 'zod';
import { api } from '../client';
import { zIncludeDrills } from '../incidentZod';
import type { JsonObject } from '../types';

type Input = {
  incidentId: string;
  includeDrills?: boolean;
  meetingUrl: string;
  language?: 'ja' | 'en' | 'multi';
};

export function registerCreateIncidentMeetingBot(server: McpServer) {
  server.registerTool(
    'create_incident_meeting_bot',
    {
      description:
        "Send a transcription bot into a Zoom, Google Meet, Microsoft Teams or Webex meeting attached to this incident. The bot keeps a rolling summary in one incident note while the call runs and replaces it with the final summary (plus recording and transcript links as Related Resources) once it leaves. The bot is dispatched asynchronously — poll list_incident_meeting_bots for status. The bot does not speak or create tasks. Returns 409 if a bot is already active in this meeting.",
      inputSchema: z.object({
        incidentId: z.string().uuid().describe('The UUID of the incident'),
        includeDrills: zIncludeDrills,
        meetingUrl: z
          .string()
          .url()
          .describe('https meeting link (Zoom, Google Meet, Microsoft Teams or Webex)'),
        language: z
          .enum(['ja', 'en', 'multi'])
          .optional()
          .describe(
            "Spoken language of the meeting; defaults to the tenant language. 'multi' detects mixed Japanese and English.",
          ),
      }),
    },
    async (input: Input) => {
      try {
        const body: JsonObject = { meeting_url: input.meetingUrl };
        if (input.language !== undefined) body.language = input.language;
        const data = await api.createIncidentMeetingBot(input.incidentId, body, { includeDrills: input.includeDrills });
        return { content: [{ type: 'text' as const, text: JSON.stringify(data, null, 2) }] };
      } catch (error) {
        const msg = error instanceof Error ? error.message : 'Unknown error occurred';
        return {
          content: [{ type: 'text' as const, text: `Error dispatching meeting bot: ${msg}` }],
          isError: true,
        };
      }
    },
  );
}
