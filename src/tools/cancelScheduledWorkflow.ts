import { McpServer } from "@modelcontextprotocol/server";
import { z } from 'zod';
import { api } from '../client';
import { zIncludeDrills } from '../incidentZod';

export function registerCancelScheduledWorkflow(server: McpServer) {
  server.registerTool(
    'cancel_scheduled_workflow',
    {
      description: 'Cancel a scheduled workflow for an incident. Only pending/scheduled workflows can be cancelled.',
      inputSchema: z.object({
        incidentId: z.string().uuid().describe('The UUID of the incident'),
        includeDrills: zIncludeDrills,
        workflowId: z.string().uuid().describe('The UUID of the scheduled workflow to cancel'),
      }),
    },
    async (input) => {
      try {
        const data = await api.cancelScheduledWorkflow(input.incidentId, input.workflowId, { includeDrills: input.includeDrills });
        return { content: [{ type: 'text' as const, text: JSON.stringify(data, null, 2) }] };
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
        return {
          content: [{ type: 'text' as const, text: `Error cancelling scheduled workflow: ${errorMessage}` }],
          isError: true,
        };
      }
    },
  );
}
