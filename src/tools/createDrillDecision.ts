import { McpServer } from "@modelcontextprotocol/server";
import { z } from 'zod';
import { api } from '../client';
import { toJsonValue, zDrillDecisionCheck, zDrillDecisionSource } from '../drillZod';
import type { JsonObject } from '../types';

export function registerCreateDrillDecision(server: McpServer) {
  server.registerTool(
    'create_drill_decision',
    {
      description:
        'Record a participant decision or a controller observation while the drill is running. In auto facilitator mode a participant decision may hand out the next card. Checks are only for controller records.',
      inputSchema: z.object({
        sessionId: z.string().uuid().describe('The UUID of the drill session'),
        decision: z.string().min(1).max(4000).describe('What was decided or observed'),
        role: z.string().max(100).nullable().optional().describe('Role the decision is attributed to'),
        injectSeq: z
          .number()
          .int()
          .nullable()
          .optional()
          .describe('Card seq this decision answers. Null when it is not tied to a card.'),
        source: zDrillDecisionSource
          .optional()
          .describe('participant (default) or controller'),
        checks: z
          .array(zDrillDecisionCheck)
          .max(20)
          .optional()
          .describe('Controller checklist (max 20). Each item is the expected action and whether it was met.'),
      }),
    },
    async (input) => {
      try {
        const body: JsonObject = { decision: input.decision };
        if (input.role !== undefined) body.role = input.role;
        if (input.injectSeq !== undefined) body.injectSeq = input.injectSeq;
        if (input.source !== undefined) body.source = input.source;
        if (input.checks !== undefined) body.checks = toJsonValue(input.checks);
        const data = await api.createDrillDecision(input.sessionId, body);
        return { content: [{ type: 'text' as const, text: JSON.stringify(data, null, 2) }] };
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
        return {
          content: [{ type: 'text' as const, text: `Error recording drill decision: ${errorMessage}` }],
          isError: true,
        };
      }
    },
  );
}
