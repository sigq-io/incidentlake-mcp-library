import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { RequestHandlerExtra } from '@modelcontextprotocol/sdk/shared/protocol.js';
import type {
  CallToolResult,
  ServerNotification,
  ServerRequest,
  ToolAnnotations,
} from '@modelcontextprotocol/sdk/types.js';

const DANGEROUS_TOOL_PATTERN =
  /^(bulk_)?(delete|remove|update|replace|upsert|resolve|reopen|publish|cancel|dismiss|approve|unlink|uncomplete|sync|save)_/;

const APPROVAL_TIMEOUT_MS = 10 * 60 * 1000;

type RegisterTool = McpServer['registerTool'];
type ToolConfig = { annotations?: ToolAnnotations; [key: string]: unknown };
type ToolExtra = RequestHandlerExtra<ServerRequest, ServerNotification>;
type ToolHandler = (...args: unknown[]) => CallToolResult | Promise<CallToolResult>;

export function isDangerousTool(name: string): boolean {
  return DANGEROUS_TOOL_PATTERN.test(name);
}

/**
 * Delete/update-style tools registered on `server` after this call ask the user to approve each call
 * (MCP elicitation) before touching any data, and are annotated with `destructiveHint` so clients
 * prompt for confirmation themselves. Clients without form elicitation, including the stateless
 * HTTP transport, which has no session to send the request on, rely on that client-side prompt.
 */
export function requireApprovalForDangerousTools(server: McpServer): void {
  const registerTool = server.registerTool.bind(server) as (
    name: string,
    config: ToolConfig,
    cb: ToolHandler,
  ) => ReturnType<RegisterTool>;

  server.registerTool = ((name: string, config: ToolConfig, cb: ToolHandler) => {
    if (!isDangerousTool(name)) {
      return registerTool(name, config, cb);
    }
    return registerTool(
      name,
      { ...config, annotations: { ...config.annotations, readOnlyHint: false, destructiveHint: true } },
      async (...args: unknown[]) => {
        const extra = args[args.length - 1] as ToolExtra;
        const input = args.length > 1 ? args[0] : undefined;
        const refusal = await requestApproval(server, name, input, extra);
        return refusal ?? cb(...args);
      },
    );
  }) as RegisterTool;
}

async function requestApproval(
  server: McpServer,
  name: string,
  input: unknown,
  extra: ToolExtra,
): Promise<CallToolResult | undefined> {
  if (!server.server.getClientCapabilities()?.elicitation?.form) {
    return undefined;
  }

  try {
    const result = await server.server.elicitInput(
      {
        mode: 'form',
        message: `Approve running "${name}"? This deletes or changes data in Incident Lake.\n\nArguments:\n${JSON.stringify(input ?? {}, null, 2)}`,
        requestedSchema: {
          type: 'object',
          properties: {
            approve: {
              type: 'boolean',
              title: 'Approve',
              description: `Run "${name}" with the arguments above`,
              default: false,
            },
          },
          required: ['approve'],
        },
      },
      { relatedRequestId: extra.requestId, signal: extra.signal, timeout: APPROVAL_TIMEOUT_MS },
    );
    if (result.action === 'accept' && result.content?.approve === true) {
      return undefined;
    }
    return refuse(
      `The user did not approve "${name}", so nothing was changed. Do not retry unless the user asks for it again.`,
    );
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    return refuse(`Could not get the user's approval for "${name}", so nothing was changed: ${errorMessage}`);
  }
}

function refuse(text: string): CallToolResult {
  return { content: [{ type: 'text' as const, text }], isError: true };
}
