import { McpServer } from "@modelcontextprotocol/server";
import { z } from 'zod';
import { api } from '../client';
import { INTEGRATION_CONNECTION_PROVIDERS } from '../types';

export function registerVerifyIntegrationConnection(server: McpServer) {
  server.registerTool(
    'verify_integration_connection',
    {
      description:
        'Test a saved integration with its stored credentials (POST /v1/integrations/{provider}/verify-connection). The request body is ignored and secrets are never returned. A rejected credential is still a successful result with result "unauthorized", "forbidden", "unreachable", or "unexpected". An error means nothing is saved for that provider.',
      inputSchema: z.object({
        provider: z
          .enum(INTEGRATION_CONNECTION_PROVIDERS)
          .describe(
            `Integration to test. One of: ${INTEGRATION_CONNECTION_PROVIDERS.join(', ')}`,
          ),
      }),
    },
    async (input) => {
      try {
        const data = await api.verifyIntegrationConnection(input.provider);
        return { content: [{ type: 'text' as const, text: JSON.stringify(data, null, 2) }] };
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
        return {
          content: [{ type: 'text' as const, text: `Error verifying integration connection: ${errorMessage}` }],
          isError: true,
        };
      }
    },
  );
}
