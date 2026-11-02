import { McpServer } from "@modelcontextprotocol/server";
import { z } from 'zod';
import { api } from '../client';
import {
  toJsonObject,
  toJsonValue,
  zDrillFacilitatorMode,
  zDrillParticipant,
  zDrillSchedulePatch,
} from '../drillZod';
import type { JsonObject } from '../types';

export function registerUpdateDrillSession(server: McpServer) {
  server.registerTool(
    'update_drill_session',
    {
      description:
        'Update a drill session plan: reschedule, replace participants, or change the facilitator mode. Controllers only. Schedule and participants can change only while the session is scheduled. At least one field is required.',
      inputSchema: z.object({
        sessionId: z.string().uuid().describe('The UUID of the drill session'),
        schedule: zDrillSchedulePatch.optional().describe('Fields to change. startAt cannot be cleared.'),
        participants: z
          .array(zDrillParticipant)
          .optional()
          .describe('Replacement participant list'),
        facilitatorMode: zDrillFacilitatorMode.optional(),
      }),
    },
    async (input) => {
      try {
        const body: JsonObject = {};
        if (input.schedule !== undefined) body.schedule = toJsonObject(input.schedule);
        if (input.participants !== undefined) body.participants = toJsonValue(input.participants);
        if (input.facilitatorMode !== undefined) body.facilitatorMode = input.facilitatorMode;
        const data = await api.updateDrillSession(input.sessionId, body);
        return { content: [{ type: 'text' as const, text: JSON.stringify(data, null, 2) }] };
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
        return {
          content: [{ type: 'text' as const, text: `Error updating drill session: ${errorMessage}` }],
          isError: true,
        };
      }
    },
  );
}
