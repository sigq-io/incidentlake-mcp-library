import type { IncomingMessage, ServerResponse } from 'node:http';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import { registerTools, type RegisterToolsOptions } from './tools/index';
import { registerResources } from './resources/index';
import { runWithCredentials, type Credentials } from './credentials';

export type { Credentials, RegisterToolsOptions };
export { runWithCredentials };

export function createIncidentLakeMcpServer(options: RegisterToolsOptions = {}): McpServer {
  const server = new McpServer({
    name: 'sigq-incident-lake',
    version: '0.7.0',
  });

  registerTools(server, options);
  registerResources(server);

  return server;
}

/**
 * Serves a single Streamable HTTP request in stateless mode: a fresh server and transport are
 * created per request, and every Public API call the tools make while handling it uses
 * `credentials`. `parsedBody` is the JSON body when a body parser has already consumed the stream.
 */
export async function handleStreamableHttpRequest(
  req: IncomingMessage,
  res: ServerResponse,
  parsedBody: unknown,
  credentials: Credentials,
): Promise<void> {
  const server = createIncidentLakeMcpServer({ localFileAccess: false });
  const transport = new StreamableHTTPServerTransport({
    sessionIdGenerator: undefined,
    enableJsonResponse: true,
  });
  res.on('close', () => {
    void transport.close();
    void server.close();
  });

  await server.connect(transport);
  await runWithCredentials(credentials, () => transport.handleRequest(req, res, parsedBody));
}
