import { McpServer } from "@modelcontextprotocol/server";
import { z } from 'zod';
import { api } from '../client';
import type { JsonObject } from '../types';

export function registerUpsertServiceDependency(server: McpServer) {
  server.registerTool(
    'upsert_service_dependency',
    {
      description:
        'Create or update a CMDB dependency edge. Upserts by (parentServiceId, childServiceId) — ' +
        'posting an existing pair updates that edge instead of duplicating it. The edge is directed: ' +
        'parent depends on child. External/Cloud services cannot depend on internal ones.',
      inputSchema: z.object({
        parentServiceId: z
          .string()
          .uuid()
          .describe('The dependent service (the one that depends on the child)'),
        childServiceId: z.string().uuid().describe('The depended-upon service'),
        dependencyType: z
          .enum(['API_CALL', 'DB_LINK', 'SHARED_INFRA', 'OTHER'])
          .optional()
          .describe('Nature of the dependency'),
        confidenceScore: z
          .number()
          .min(0)
          .max(1)
          .optional()
          .describe('Confidence in this dependency, 0 to 1'),
        evidenceSnippet: z.string().optional().describe('Text this dependency was inferred from'),
        sourceUrl: z.string().optional().describe('Link to the doc this dependency came from'),
      }),
    },
    async (input) => {
      try {
        const body: JsonObject = {
          parentServiceId: input.parentServiceId,
          childServiceId: input.childServiceId,
        };
        if (input.dependencyType !== undefined) body.dependencyType = input.dependencyType;
        if (input.confidenceScore !== undefined) body.confidenceScore = input.confidenceScore;
        if (input.evidenceSnippet !== undefined) body.evidenceSnippet = input.evidenceSnippet;
        if (input.sourceUrl !== undefined) body.sourceUrl = input.sourceUrl;
        const data = await api.upsertServiceDependency(body);
        return { content: [{ type: 'text' as const, text: JSON.stringify(data, null, 2) }] };
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
        return {
          content: [
            { type: 'text' as const, text: `Error upserting service dependency: ${errorMessage}` },
          ],
          isError: true,
        };
      }
    },
  );
}
