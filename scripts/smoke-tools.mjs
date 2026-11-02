#!/usr/bin/env node
/**
 * Incident Lake MCP — offline smoke test
 *
 * Starts the built server (dist/index.js) over stdio and checks that it initializes and that
 * tools/list returns well-formed tools: unique names, a description, and an object input schema.
 * No Public API call is made, so dummy credentials are enough. Also checks that dist/server.js
 * loads and creates a server.
 *
 * Usage:
 *   npm run build && node scripts/smoke-tools.mjs              # current SIGQ_TOOLSETS
 *   node scripts/smoke-tools.mjs "" all none                   # once per SIGQ_TOOLSETS value
 */

import { spawn } from 'child_process';
import { existsSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath, pathToFileURL } from 'url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const DIST_INDEX = resolve(ROOT, 'dist/index.js');
const DIST_SERVER = resolve(ROOT, 'dist/server.js');
const TIMEOUT_MS = 15_000;

function startServer(toolsets) {
  const env = { ...process.env, SIGQ_API_URL: 'http://127.0.0.1:9', SIGQ_API_TOKEN: 'smoke-test' };
  if (toolsets === undefined) delete env.SIGQ_TOOLSETS;
  else env.SIGQ_TOOLSETS = toolsets;

  const proc = spawn('node', [DIST_INDEX], { env, stdio: ['pipe', 'pipe', 'pipe'] });
  const pending = new Map();
  let nextId = 1;
  let buffer = '';
  let stderr = '';

  proc.stderr.on('data', (d) => { stderr += d; });
  proc.stdout.on('data', (d) => {
    buffer += d;
    let newline;
    while ((newline = buffer.indexOf('\n')) >= 0) {
      const line = buffer.slice(0, newline).trim();
      buffer = buffer.slice(newline + 1);
      if (!line) continue;
      let msg;
      try { msg = JSON.parse(line); } catch { continue; }
      const waiter = pending.get(msg.id);
      if (!waiter) continue;
      pending.delete(msg.id);
      if (msg.error) waiter.reject(new Error(msg.error.message ?? JSON.stringify(msg.error)));
      else waiter.resolve(msg.result);
    }
  });
  proc.on('exit', (code) => {
    for (const { reject } of pending.values()) {
      reject(new Error(`Server exited with code ${code}\n${stderr}`));
    }
    pending.clear();
  });

  const request = (method, params = {}) => {
    const id = nextId++;
    proc.stdin.write(JSON.stringify({ jsonrpc: '2.0', id, method, params }) + '\n');
    return new Promise((res, rej) => {
      const timer = setTimeout(() => {
        pending.delete(id);
        rej(new Error(`Timeout waiting for ${method}\n${stderr}`));
      }, TIMEOUT_MS);
      pending.set(id, {
        resolve: (v) => { clearTimeout(timer); res(v); },
        reject: (e) => { clearTimeout(timer); rej(e); },
      });
    });
  };
  const notify = (method) => proc.stdin.write(JSON.stringify({ jsonrpc: '2.0', method }) + '\n');

  return { request, notify, stop: () => proc.kill() };
}

function problemsIn(tools) {
  const problems = [];
  const seen = new Set();
  for (const tool of tools) {
    if (seen.has(tool.name)) problems.push(`duplicate tool name: ${tool.name}`);
    seen.add(tool.name);
    if (!tool.description?.trim()) problems.push(`${tool.name}: missing description`);
    if (tool.inputSchema?.type !== 'object') {
      problems.push(`${tool.name}: inputSchema type is ${JSON.stringify(tool.inputSchema?.type)}, expected "object"`);
    }
  }
  return problems;
}

async function checkToolList(toolsets) {
  const label = toolsets === undefined ? 'SIGQ_TOOLSETS unset' : `SIGQ_TOOLSETS=${JSON.stringify(toolsets)}`;
  const server = startServer(toolsets);
  try {
    await server.request('initialize', {
      protocolVersion: '2025-06-18',
      capabilities: {},
      clientInfo: { name: 'smoke-tools', version: '0' },
    });
    server.notify('notifications/initialized');

    const tools = [];
    let cursor;
    do {
      const page = await server.request('tools/list', cursor ? { cursor } : {});
      tools.push(...(page.tools ?? []));
      cursor = page.nextCursor;
    } while (cursor);

    const problems = tools.length === 0 ? ['tools/list returned no tools'] : problemsIn(tools);
    if (problems.length > 0) throw new Error(problems.join('\n'));
    console.log(`ok   ${label}: ${tools.length} tools`);
  } finally {
    server.stop();
  }
}

async function checkServerEntry() {
  const mod = await import(pathToFileURL(DIST_SERVER).href);
  const server = mod.createIncidentLakeMcpServer();
  if (typeof server?.connect !== 'function') throw new Error('createIncidentLakeMcpServer did not return an McpServer');
  await server.close();
  console.log('ok   dist/server.js: createIncidentLakeMcpServer');
}

async function main() {
  for (const path of [DIST_INDEX, DIST_SERVER]) {
    if (!existsSync(path)) throw new Error(`${path} not found; run npm run build first`);
  }
  const variants = process.argv.length > 2 ? process.argv.slice(2) : [process.env.SIGQ_TOOLSETS];
  for (const toolsets of variants) await checkToolList(toolsets);
  await checkServerEntry();
}

main().catch((error) => {
  console.error(`FAIL ${error.message}`);
  process.exit(1);
});
