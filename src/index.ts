#!/usr/bin/env node
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { createIncidentLakeMcpServer } from './server';
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
  const server = createIncidentLakeMcpServer();

  const transport = new StdioServerTransport();
  await server.connect(transport);

  const shutdown = async () => {
    await server.close();
    process.exit(0);
  };

  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
}

