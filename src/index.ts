#!/usr/bin/env node
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { registerTools } from './tools/index';
import { registerResources } from './resources/index';
import { runConfigure } from './configure';

if (process.argv[2] === 'configure') {
  runConfigure().catch((err) => {
    console.error('Configure failed:', err);
    process.exit(1);
  });
} else {
  main().catch((err) => {
    console.error('MCP Server failed to start:', err);
    process.exit(1);
  });
}

async function main() {
  const server = new McpServer({
    name: 'sigq-incident-lake',
    version: '0.3.0',
  });

  registerTools(server);
  registerResources(server);

  const transport = new StdioServerTransport();
  await server.connect(transport);

  const shutdown = async () => {
    await server.close();
    process.exit(0);
  };

  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
}

