import { McpServer } from "@modelcontextprotocol/server";
import { z } from 'zod';
import { api } from '../client';
import { toJsonObject, zDrillScenarioContent, zDrillScenarioStatus } from '../drillZod';
import type { JsonObject } from '../types';

export function registerUpdateDrillScenario(server: McpServer) {
  server.registerTool(
    'update_drill_scenario',
    {
      description:
        'Update a drill scenario. Send scenario to replace the content, status to move it between draft, approved, and archived, or targetRecordId to attach a master record. At least one field is required. A session can only be scheduled from an approved scenario.',
      inputSchema: z.object({
        scenarioId: z.string().uuid().describe('The UUID of the drill scenario'),
        scenario: zDrillScenarioContent.optional().describe('Replacement scenario content'),
        status: zDrillScenarioStatus.optional().describe('draft, approved, or archived'),
        targetRecordId: z
          .string()
          .uuid()
          .nullable()
          .optional()
          .describe('Master record this scenario was written for. Null clears it.'),
      }),
    },
    async (input) => {
      try {
        const body: JsonObject = {};
        if (input.scenario !== undefined) body.scenario = toJsonObject(input.scenario);
        if (input.status !== undefined) body.status = input.status;
        if (input.targetRecordId !== undefined) body.targetRecordId = input.targetRecordId;
        const data = await api.updateDrillScenario(input.scenarioId, body);
        return { content: [{ type: 'text' as const, text: JSON.stringify(data, null, 2) }] };
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
        return {
          content: [{ type: 'text' as const, text: `Error updating drill scenario: ${errorMessage}` }],
          isError: true,
        };
      }
    },
  );
}
