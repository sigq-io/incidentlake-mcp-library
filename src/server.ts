import type { IncomingMessage, ServerResponse } from 'node:http';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import { registerTools, type RegisterToolsOptions } from './tools/index';
import { registerResources } from './resources/index';
import { runWithCredentials, type Credentials } from './credentials';
import { DEFAULT_TOOLSETS, TOOLSETS, parseToolsets, type Toolset } from './toolsets';

export type { Credentials, RegisterToolsOptions, Toolset };
export { runWithCredentials, DEFAULT_TOOLSETS, TOOLSETS, parseToolsets };

export function createIncidentLakeMcpServer(options: RegisterToolsOptions = {}): McpServer {
  const server = new McpServer({
    name: 'sigq-incident-lake',
    version: '0.7.0',
  });

  registerTools(server, { toolsets: parseToolsets(process.env.SIGQ_MCP_TOOLSETS), ...options });
  registerResources(server);

  return server;
}

function toolsetsFromUrl(url: string | undefined): string | null {
  if (!url) return null;
  return new URL(url, 'http://localhost').searchParams.get('toolsets');
}

/**
 * Serves a single Streamable HTTP request in stateless mode: a fresh server and transport are
 * created per request, and every Public API call the tools make while handling it uses
 * `credentials`. `parsedBody` is the JSON body when a body parser has already consumed the stream.
 * A `toolsets` query parameter on the request URL (e.g. `?toolsets=default,specs`) overrides
 * SIGQ_MCP_TOOLSETS for that client.
 */
export async function handleStreamableHttpRequest(
  req: IncomingMessage,
  res: ServerResponse,
  parsedBody: unknown,
  credentials: Credentials,
): Promise<void> {
  const requested = toolsetsFromUrl(req.url);
  const server = createIncidentLakeMcpServer({
    localFileAccess: false,
    ...(requested === null ? {} : { toolsets: parseToolsets(requested) }),
  });
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
