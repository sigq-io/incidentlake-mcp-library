import { McpServer } from "@modelcontextprotocol/server";
import { z } from 'zod';
import { api } from '../client';
import {
  toJsonObject,
  toJsonValue,
  zDrillFacilitatorMode,
  zDrillLanguage,
  zDrillParticipant,
  zDrillSchedule,
} from '../drillZod';
import type { JsonObject } from '../types';

export function registerCreateDrillSession(server: McpServer) {
  server.registerTool(
    'create_drill_session',
    {
      description:
        'Schedule a drill session from an approved scenario. This also creates the drill incident the session runs in. That incident stays hidden from incident tools unless includeDrills is true. The schedule must be ordered: briefing, start, debrief, follow-up.',
      inputSchema: z.object({
        scenarioId: z.string().uuid().describe('UUID of an approved drill scenario'),
        schedule: zDrillSchedule,
        language: zDrillLanguage,
        facilitatorMode: zDrillFacilitatorMode
          .optional()
          .describe('suggest (default), auto, or off'),
        participants: z
          .array(zDrillParticipant)
          .optional()
          .describe('Players, controllers, and observers. Each needs a role.'),
      }),
    },
    async (input) => {
      try {
        const body: JsonObject = {
          scenarioId: input.scenarioId,
          schedule: toJsonObject(input.schedule),
        };
        if (input.language !== undefined) body.language = input.language;
        if (input.facilitatorMode !== undefined) body.facilitatorMode = input.facilitatorMode;
        if (input.participants !== undefined) body.participants = toJsonValue(input.participants);
        const data = await api.createDrillSession(body);
        return { content: [{ type: 'text' as const, text: JSON.stringify(data, null, 2) }] };
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
        return {
          content: [{ type: 'text' as const, text: `Error scheduling drill session: ${errorMessage}` }],
          isError: true,
        };
      }
    },
  );
}
