#!/usr/bin/env node
/**
 * Incident Lake MCP — integration test script
 *
 * Spawns the MCP server as a child process, communicates over stdio using the
 * MCP JSON-RPC protocol, and runs a full lifecycle test of every tool.
 *
 * Prerequisites:
 *   SIGQ_API_URL   — e.g. https://your-tenant.incidentlake.io/incidentlake/public-api
 *   SIGQ_API_TOKEN — your public API bearer token
 *
 * Usage:
 *   node scripts/test-mcp.mjs               # run all tests and exit
 *   node scripts/test-mcp.mjs --interactive  # run tests then drop into interactive mode
 *   VERBOSE=1 node scripts/test-mcp.mjs     # also print server stderr logs
 */

import { spawn } from 'child_process';
import { createInterface } from 'readline';
import { existsSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');

// ── ANSI colours ────────────────────────────────────────────────────────────
const green  = (s) => `\x1b[32m${s}\x1b[0m`;
const red    = (s) => `\x1b[31m${s}\x1b[0m`;
const yellow = (s) => `\x1b[33m${s}\x1b[0m`;
const cyan   = (s) => `\x1b[36m${s}\x1b[0m`;
const bold   = (s) => `\x1b[1m${s}\x1b[0m`;

// ── Test counters ────────────────────────────────────────────────────────────
let passed = 0, failed = 0, skipped = 0;
const failures = [];

// ── JSON-RPC over stdio ──────────────────────────────────────────────────────
let requestId = 1;
const pending = new Map(); // id → { resolve, reject }

function send(proc, method, params = {}) {
  const id = requestId++;
  proc.stdin.write(JSON.stringify({ jsonrpc: '2.0', id, method, params }) + '\n');
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      pending.delete(id);
      reject(new Error(`Timeout waiting for ${method} (id=${id})`));
    }, 15_000);
    pending.set(id, {
      resolve: (v) => { clearTimeout(timer); resolve(v); },
      reject:  (e) => { clearTimeout(timer); reject(e); },
    });
  });
}

function handleLine(line) {
  line = line.trim();
  if (!line) return;
  let msg;
  try { msg = JSON.parse(line); } catch { return; }
  if (msg.id != null && pending.has(msg.id)) {
    const { resolve, reject } = pending.get(msg.id);
    pending.delete(msg.id);
    if (msg.error) reject(new Error(msg.error.message ?? JSON.stringify(msg.error)));
    else resolve(msg.result);
  }
}

// ── Tool call helper ─────────────────────────────────────────────────────────
async function callTool(proc, name, args = {}) {
  const result = await send(proc, 'tools/call', { name, arguments: args });
  if (result?.isError) {
    throw new Error(result.content?.[0]?.text ?? 'Tool returned isError=true');
  }
  return result;
}

function parseContent(result) {
  return JSON.parse(result?.content?.[0]?.text);
}

// ── Test runner ──────────────────────────────────────────────────────────────
async function test(name, fn) {
  process.stdout.write(`  ${name} ... `);
  try {
    const result = await fn();
    console.log(green('PASS'));
    passed++;
    return result;
  } catch (err) {
    console.log(red('FAIL'));
    console.log(red(`    ${err.message}`));
    failed++;
    failures.push({ name, error: err.message });
    return null;
  }
}

function skip(name, reason) {
  console.log(`  ${name} ... ${yellow('SKIP')} (${reason})`);
  skipped++;
}

// ── Main ─────────────────────────────────────────────────────────────────────
async function main() {
  const interactive = process.argv.includes('--interactive');

  // Prefer compiled dist; fall back to tsx for dev
  const distPath = resolve(ROOT, 'dist/index.js');
  const srcPath  = resolve(ROOT, 'src/index.ts');
  const [cmd, args] = existsSync(distPath)
    ? ['node', [distPath]]
    : ['npx', ['tsx', srcPath]];

  console.log(bold('\n Incident Lake MCP — Test Suite\n'));
  console.log(cyan(`  Server: ${existsSync(distPath) ? 'dist/index.js' : 'src/index.ts (tsx)'}`));

  if (!process.env.SIGQ_API_TOKEN) {
    console.log(yellow('  Warning: SIGQ_API_TOKEN not set — tool calls will return auth errors\n'));
  } else {
    console.log(cyan(`  API URL: ${process.env.SIGQ_API_URL ?? 'http://localhost:3000/incidentlake/public-api'}`));
    console.log();
  }

  const mcpProcess = spawn(cmd, args, {
    stdio: 'pipe',
    cwd: ROOT,
    env: { ...process.env },
  });

  createInterface({ input: mcpProcess.stdout }).on('line', handleLine);

  mcpProcess.stderr.on('data', (data) => {
    if (process.env.VERBOSE) process.stderr.write(`[server] ${data}`);
  });

  mcpProcess.on('exit', (code) => {
    if (code !== 0 && code !== null) console.log(red(`\nServer exited with code ${code}`));
  });

  // Give the server a moment to start
  await new Promise((r) => setTimeout(r, 500));

  // ── Protocol ───────────────────────────────────────────────────────────────
  console.log(bold('Protocol'));

  await test('initialize', async () => {
    const r = await send(mcpProcess, 'initialize', {
      protocolVersion: '2024-11-05',
      capabilities: { tools: {} },
      clientInfo: { name: 'incidentlake-mcp-test', version: '1.0.0' },
    });
    if (!r?.serverInfo) throw new Error('Missing serverInfo in response');
    return r;
  });

  // ── Tools list ─────────────────────────────────────────────────────────────
  const EXPECTED_TOOLS = [
    'list_incidents', 'get_incident', 'search_incidents', 'get_incident_analytics',
    'create_incident', 'update_incident', 'resolve_incident', 'reopen_incident',
    'delete_incident', 'get_sop_completions', 'add_incident_note',
    'get_incident_tags', 'add_incident_tags', 'replace_incident_tags', 'remove_incident_tags',
    'list_members',
    'list_knowledge_items', 'search_knowledge_items', 'list_knowledge_tags',
    'get_knowledge_item', 'create_knowledge_item', 'update_knowledge_item',
    'delete_knowledge_item', 'update_knowledge_item_tags',
    'list_pending_knowledge_drafts', 'approve_knowledge_draft', 'dismiss_knowledge_draft',
    'get_current_tenant', 'add_related_resource_by_url',
    'search_jira_issues', 'search_notion_pages',
    'get_incident_phase_graph',
    'create_incident_phase_node', 'update_incident_phase_node', 'delete_incident_phase_node',
    'create_incident_phase_edge', 'delete_incident_phase_edge',
    'list_incident_phase_captures',
    'create_incident_phase_capture', 'delete_incident_phase_capture',
    'get_incident_phase_telemetry',
    'search_zabbix_problems', 'add_zabbix_related_resource', 'create_incident_from_zabbix_problem',
    'search_instana_events', 'add_instana_related_resource', 'create_incident_from_instana_event',
  ];

  await test('tools/list — all expected tools present', async () => {
    const r = await send(mcpProcess, 'tools/list', {});
    const names = (r?.tools ?? []).map((t) => t.name);
    const missing = EXPECTED_TOOLS.filter((t) => !names.includes(t));
    if (missing.length) throw new Error(`Missing tools: ${missing.join(', ')}`);
    return r;
  });

  // ── Read-only tools ────────────────────────────────────────────────────────
  console.log(bold('\nRead-only Tools'));

  await test('list_incidents (no filters)', async () => {
    const data = parseContent(await callTool(mcpProcess, 'list_incidents', {}));
    // API returns { items: [...], nextCursor?, totalCount? }
    const items = Array.isArray(data) ? data : (data?.items ?? data?.incidents);
    if (!Array.isArray(items)) throw new Error(`Expected items array, got: ${JSON.stringify(data).slice(0, 200)}`);
    return data;
  });

  await test('list_incidents (status=ongoing, limit=5)', async () => {
    const data = parseContent(
      await callTool(mcpProcess, 'list_incidents', { status: 'ongoing', limit: 5 }),
    );
    const items = Array.isArray(data) ? data : (data?.items ?? data?.incidents);
    if (!Array.isArray(items)) throw new Error(`Expected items array, got: ${JSON.stringify(data).slice(0, 200)}`);
    return data;
  });

  await test('search_incidents', async () => {
    const data = parseContent(await callTool(mcpProcess, 'search_incidents', { query: 'test', limit: 5 }));
    // API returns { items: [...], ... }
    const items = Array.isArray(data) ? data : (data?.items ?? data?.incidents);
    if (!Array.isArray(items)) throw new Error(`Expected items array, got: ${JSON.stringify(data).slice(0, 200)}`);
    return data;
  });

  await test('get_incident_analytics (last 30 days)', async () => {
    const end   = new Date().toISOString().slice(0, 10);
    const start = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
    return parseContent(await callTool(mcpProcess, 'get_incident_analytics', { startDate: start, endDate: end }));
  });

  await test('list_members', async () => {
    const data = parseContent(await callTool(mcpProcess, 'list_members', {}));
    if (!Array.isArray(data)) throw new Error('Expected array of members');
    return data;
  });

  await test('list_knowledge_items', async () => {
    const data = parseContent(await callTool(mcpProcess, 'list_knowledge_items', {}));
    if (!Array.isArray(data)) throw new Error('Expected array of knowledge items');
    return data;
  });

  await test('list_knowledge_tags', async () => {
    const data = parseContent(await callTool(mcpProcess, 'list_knowledge_tags', {}));
    if (!Array.isArray(data)) throw new Error('Expected array of tags');
    return data;
  });

  await test('search_knowledge_items', async () => {
    const data = parseContent(
      await callTool(mcpProcess, 'search_knowledge_items', { query: 'test', limit: 5 }),
    );
    if (!Array.isArray(data)) throw new Error('Expected array of knowledge items');
    return data;
  });

  // ── Incident lifecycle ─────────────────────────────────────────────────────
  console.log(bold('\nIncident Lifecycle'));

  let incidentId = null;

  await test('create_incident', async () => {
    const data = parseContent(await callTool(mcpProcess, 'create_incident', {
      name: '[MCP Test] Automated test incident',
      summary: 'Created by scripts/test-mcp.mjs — safe to delete',
      severity: 4,
      tags: ['test:automated'],
    }));
    if (!data.id) throw new Error('No id in response');
    incidentId = data.id;
    return data;
  });

  if (incidentId) {
    await test('get_incident', async () => {
      const data = parseContent(await callTool(mcpProcess, 'get_incident', { incidentId }));
      if (data.id !== incidentId) throw new Error('ID mismatch');
      return data;
    });

    await test('update_incident', async () => {
      const data = parseContent(await callTool(mcpProcess, 'update_incident', {
        incidentId,
        summary: 'Updated by scripts/test-mcp.mjs',
      }));
      if (data.id !== incidentId) throw new Error('ID mismatch');
      return data;
    });

    await test('add_incident_note', async () => {
      return parseContent(await callTool(mcpProcess, 'add_incident_note', {
        incidentId,
        content: 'Note added by scripts/test-mcp.mjs',
      }));
    });

    await test('get_sop_completions', async () => {
      return parseContent(await callTool(mcpProcess, 'get_sop_completions', { incidentId }));
    });

    await test('get_incident_tags', async () => {
      const data = parseContent(await callTool(mcpProcess, 'get_incident_tags', { incidentId }));
      if (!Array.isArray(data.tags)) throw new Error('Expected tags array');
      return data;
    });

    await test('add_incident_tags', async () => {
      return parseContent(await callTool(mcpProcess, 'add_incident_tags', {
        incidentId,
        tags: ['test:tag-add'],
      }));
    });

    await test('replace_incident_tags', async () => {
      return parseContent(await callTool(mcpProcess, 'replace_incident_tags', {
        incidentId,
        tags: ['test:tag-replaced'],
      }));
    });

    await test('remove_incident_tags', async () => {
      return parseContent(await callTool(mcpProcess, 'remove_incident_tags', {
        incidentId,
        tags: ['test:tag-replaced'],
      }));
    });

    // ── Response timeline (phase graph / captures / telemetry) ──────────────
    const phaseGraphData = await test('get_incident_phase_graph', async () => {
      const data = parseContent(await callTool(mcpProcess, 'get_incident_phase_graph', { incidentId }));
      if (!Array.isArray(data.nodes)) throw new Error('Expected nodes array');
      return data;
    });

    if (phaseGraphData?.nodes?.length) {
      const phaseNodeId = phaseGraphData.nodes[0].id;
      let phaseCaptureId = null;

      await test('create_incident_phase_capture', async () => {
        const data = parseContent(await callTool(mcpProcess, 'create_incident_phase_capture', {
          incidentId,
          nodeId: phaseNodeId,
          note: 'Captured by scripts/test-mcp.mjs',
        }));
        if (!data.id) throw new Error('No id in response');
        phaseCaptureId = data.id;
        return data;
      });

      await test('list_incident_phase_captures', async () => {
        const data = parseContent(await callTool(mcpProcess, 'list_incident_phase_captures', { incidentId }));
        if (!Array.isArray(data)) throw new Error('Expected array of captures');
        return data;
      });

      await test('get_incident_phase_telemetry', async () => {
        const data = parseContent(await callTool(mcpProcess, 'get_incident_phase_telemetry', { incidentId }));
        if (!Array.isArray(data.nodes) || !Array.isArray(data.edges)) {
          throw new Error('Expected telemetry nodes/edges arrays');
        }
        return data;
      });

      if (phaseCaptureId) {
        await test('delete_incident_phase_capture (cleanup)', async () => {
          const data = parseContent(await callTool(mcpProcess, 'delete_incident_phase_capture', {
            incidentId,
            captureId: phaseCaptureId,
          }));
          if (!data.success) throw new Error('Expected success=true');
          return data;
        });
      } else {
        skip('delete_incident_phase_capture', 'create_incident_phase_capture failed');
      }
    } else {
      const phaseDependents = [
        'create_incident_phase_capture', 'list_incident_phase_captures',
        'get_incident_phase_telemetry', 'delete_incident_phase_capture',
      ];
      for (const t of phaseDependents) skip(t, 'no phase graph nodes configured for this tenant');
    }

    // ── Response timeline (node/edge create-edit-link lifecycle) ─────────────
    let phaseNodeAId = null;
    let phaseNodeBId = null;
    let phaseEdgeId = null;

    await test('create_incident_phase_node', async () => {
      const data = parseContent(await callTool(mcpProcess, 'create_incident_phase_node', {
        incidentId,
        label: '[MCP Test] Node A',
      }));
      if (!data.id) throw new Error('No id in response');
      phaseNodeAId = data.id;
      return data;
    });

    if (phaseNodeAId) {
      await test('create_incident_phase_node (second node)', async () => {
        const data = parseContent(await callTool(mcpProcess, 'create_incident_phase_node', {
          incidentId,
          label: '[MCP Test] Node B',
        }));
        if (!data.id) throw new Error('No id in response');
        phaseNodeBId = data.id;
        return data;
      });

      await test('update_incident_phase_node', async () => {
        const data = parseContent(await callTool(mcpProcess, 'update_incident_phase_node', {
          incidentId,
          nodeId: phaseNodeAId,
          label: '[MCP Test] Node A (renamed)',
        }));
        if (data.label !== '[MCP Test] Node A (renamed)') throw new Error('Label did not update');
        return data;
      });

      if (phaseNodeBId) {
        await test('create_incident_phase_edge', async () => {
          const data = parseContent(await callTool(mcpProcess, 'create_incident_phase_edge', {
            incidentId,
            sourceNodeId: phaseNodeAId,
            targetNodeId: phaseNodeBId,
          }));
          if (data.id === undefined) throw new Error('No id in response');
          phaseEdgeId = data.id;
          return data;
        });

        if (phaseEdgeId !== null) {
          await test('delete_incident_phase_edge (cleanup)', async () => {
            const data = parseContent(await callTool(mcpProcess, 'delete_incident_phase_edge', {
              incidentId,
              edgeId: phaseEdgeId,
            }));
            if (!data.success) throw new Error('Expected success=true');
            return data;
          });
        } else {
          skip('delete_incident_phase_edge', 'create_incident_phase_edge failed');
        }
      } else {
        for (const t of ['create_incident_phase_edge', 'delete_incident_phase_edge']) {
          skip(t, 'create_incident_phase_node (second node) failed');
        }
      }

      await test('delete_incident_phase_node (cleanup, node A)', async () => {
        const data = parseContent(await callTool(mcpProcess, 'delete_incident_phase_node', {
          incidentId,
          nodeId: phaseNodeAId,
        }));
        if (data.isArchived === undefined) throw new Error('Expected isArchived in response');
        return data;
      });

      if (phaseNodeBId) {
        await test('delete_incident_phase_node (cleanup, node B)', async () => {
          const data = parseContent(await callTool(mcpProcess, 'delete_incident_phase_node', {
            incidentId,
            nodeId: phaseNodeBId,
          }));
          if (data.isArchived === undefined) throw new Error('Expected isArchived in response');
          return data;
        });
      }
    } else {
      const phaseNodeDependents = [
        'create_incident_phase_node (second node)', 'update_incident_phase_node',
        'create_incident_phase_edge', 'delete_incident_phase_edge',
        'delete_incident_phase_node (cleanup, node A)', 'delete_incident_phase_node (cleanup, node B)',
      ];
      for (const t of phaseNodeDependents) skip(t, 'create_incident_phase_node failed');
    }

    await test('resolve_incident', async () => {
      const data = parseContent(await callTool(mcpProcess, 'resolve_incident', { incidentId }));
      if (data.status !== 'resolved') throw new Error(`Expected status=resolved, got ${data.status}`);
      return data;
    });

    await test('reopen_incident', async () => {
      return parseContent(await callTool(mcpProcess, 'reopen_incident', { incidentId }));
    });

    await test('delete_incident (cleanup)', async () => {
      const data = parseContent(await callTool(mcpProcess, 'delete_incident', { incidentId }));
      if (!data.deleted) throw new Error('Expected deleted=true');
      return data;
    });
  } else {
    const dependents = [
      'get_incident', 'update_incident', 'add_incident_note', 'get_sop_completions',
      'get_incident_tags', 'add_incident_tags', 'replace_incident_tags', 'remove_incident_tags',
      'resolve_incident', 'reopen_incident', 'delete_incident',
    ];
    for (const t of dependents) skip(t, 'create_incident failed');
  }

  // ── Zabbix ─────────────────────────────────────────────────────────────────
  console.log(bold('\nZabbix'));

  function isZabbixNotConfigured(err) {
    return /zabbix integration not configured/i.test(err.message);
  }

  await test('search_zabbix_problems', async () => {
    try {
      const data = parseContent(await callTool(mcpProcess, 'search_zabbix_problems', { query: 'test' }));
      if (!Array.isArray(data)) throw new Error('Expected array of Zabbix problems');
      return data;
    } catch (err) {
      if (isZabbixNotConfigured(err)) {
        console.log(yellow('    (Zabbix not configured for this tenant — treating as pass)'));
        return { notConfigured: true };
      }
      throw err;
    }
  });

  let zabbixIncidentId = null;

  await test('create_incident_from_zabbix_problem', async () => {
    try {
      const data = parseContent(await callTool(mcpProcess, 'create_incident_from_zabbix_problem', {
        eventId: '999999',
        triggerId: '888888',
        name: '[MCP Test] Incident from Zabbix problem',
        summary: 'Created by scripts/test-mcp.mjs — safe to delete',
        severity: 4,
      }));
      if (!data?.incident?.id) throw new Error('No incident.id in response');
      zabbixIncidentId = data.incident.id;
      return data;
    } catch (err) {
      // Even a "not configured" failure creates the incident before the link fails —
      // recover its id from the tool's error message so cleanup still runs below.
      const match = err.message.match(/Incident ([0-9a-f-]{36}) was created/i);
      if (match) zabbixIncidentId = match[1];
      if (isZabbixNotConfigured(err)) {
        console.log(yellow('    (Zabbix not configured for this tenant — treating as pass)'));
        return { notConfigured: true };
      }
      throw err;
    }
  });

  if (zabbixIncidentId) {
    await test('add_zabbix_related_resource', async () => {
      try {
        const data = parseContent(await callTool(mcpProcess, 'add_zabbix_related_resource', {
          incidentId: zabbixIncidentId,
          eventId: '777777',
          triggerId: '666666',
          name: '[MCP Test] Second Zabbix problem',
        }));
        if (!data.id) throw new Error('No id in response');
        return data;
      } catch (err) {
        if (isZabbixNotConfigured(err)) {
          console.log(yellow('    (Zabbix not configured for this tenant — treating as pass)'));
          return { notConfigured: true };
        }
        throw err;
      }
    });

    await test('delete_incident (cleanup, zabbix incident)', async () => {
      const data = parseContent(await callTool(mcpProcess, 'delete_incident', { incidentId: zabbixIncidentId }));
      if (!data.deleted) throw new Error('Expected deleted=true');
      return data;
    });
  } else {
    skip('add_zabbix_related_resource', 'create_incident_from_zabbix_problem did not create an incident');
    skip('delete_incident (cleanup, zabbix incident)', 'create_incident_from_zabbix_problem did not create an incident');
  }

  // ── Instana ────────────────────────────────────────────────────────────────
  console.log(bold('\nInstana'));

  function isInstanaNotConfigured(err) {
    return /instana integration not configured/i.test(err.message);
  }

  await test('search_instana_events', async () => {
    try {
      const data = parseContent(await callTool(mcpProcess, 'search_instana_events', { query: 'test' }));
      if (!Array.isArray(data)) throw new Error('Expected array of Instana events');
      return data;
    } catch (err) {
      if (isInstanaNotConfigured(err)) {
        console.log(yellow('    (Instana not configured for this tenant — treating as pass)'));
        return { notConfigured: true };
      }
      throw err;
    }
  });

  let instanaIncidentId = null;

  await test('create_incident_from_instana_event', async () => {
    try {
      const data = parseContent(await callTool(mcpProcess, 'create_incident_from_instana_event', {
        eventId: 'mcp-test-event-999999',
        name: '[MCP Test] Incident from Instana event',
        summary: 'Created by scripts/test-mcp.mjs — safe to delete',
        severity: 4,
      }));
      if (!data?.incident?.id) throw new Error('No incident.id in response');
      instanaIncidentId = data.incident.id;
      return data;
    } catch (err) {
      // Even a "not configured" failure creates the incident before the link fails —
      // recover its id from the tool's error message so cleanup still runs below.
      const match = err.message.match(/Incident ([0-9a-f-]{36}) was created/i);
      if (match) instanaIncidentId = match[1];
      if (isInstanaNotConfigured(err)) {
        console.log(yellow('    (Instana not configured for this tenant — treating as pass)'));
        return { notConfigured: true };
      }
      throw err;
    }
  });

  if (instanaIncidentId) {
    await test('add_instana_related_resource', async () => {
      try {
        const data = parseContent(await callTool(mcpProcess, 'add_instana_related_resource', {
          incidentId: instanaIncidentId,
          eventId: 'mcp-test-event-777777',
          name: '[MCP Test] Second Instana event',
        }));
        if (!data.id) throw new Error('No id in response');
        return data;
      } catch (err) {
        if (isInstanaNotConfigured(err)) {
          console.log(yellow('    (Instana not configured for this tenant — treating as pass)'));
          return { notConfigured: true };
        }
        throw err;
      }
    });

    await test('delete_incident (cleanup, instana incident)', async () => {
      const data = parseContent(await callTool(mcpProcess, 'delete_incident', { incidentId: instanaIncidentId }));
      if (!data.deleted) throw new Error('Expected deleted=true');
      return data;
    });
  } else {
    skip('add_instana_related_resource', 'create_incident_from_instana_event did not create an incident');
    skip('delete_incident (cleanup, instana incident)', 'create_incident_from_instana_event did not create an incident');
  }

  // ── Knowledge lifecycle ────────────────────────────────────────────────────
  console.log(bold('\nKnowledge Lifecycle'));

  let knowledgeId = null;

  await test('create_knowledge_item', async () => {
    const data = parseContent(await callTool(mcpProcess, 'create_knowledge_item', {
      title: '[MCP Test] Automated test knowledge item',
      content: 'Created by scripts/test-mcp.mjs — safe to delete',
      tags: ['test:automated'],
    }));
    if (!data.id) throw new Error('No id in response');
    knowledgeId = data.id;
    return data;
  });

  if (knowledgeId) {
    await test('get_knowledge_item', async () => {
      const data = parseContent(await callTool(mcpProcess, 'get_knowledge_item', { knowledgeId }));
      if (data.id !== knowledgeId) throw new Error('ID mismatch');
      return data;
    });

    await test('update_knowledge_item', async () => {
      const data = parseContent(await callTool(mcpProcess, 'update_knowledge_item', {
        knowledgeId,
        content: 'Updated by scripts/test-mcp.mjs',
      }));
      if (data.id !== knowledgeId) throw new Error('ID mismatch');
      return data;
    });

    await test('update_knowledge_item_tags', async () => {
      return parseContent(await callTool(mcpProcess, 'update_knowledge_item_tags', {
        knowledgeId,
        tags: ['test:tag-updated'],
      }));
    });

    await test('delete_knowledge_item (cleanup)', async () => {
      const data = parseContent(await callTool(mcpProcess, 'delete_knowledge_item', { knowledgeId }));
      if (!data.success) throw new Error('Expected success=true');
      return data;
    });
  } else {
    for (const t of ['get_knowledge_item', 'update_knowledge_item', 'update_knowledge_item_tags', 'delete_knowledge_item']) {
      skip(t, 'create_knowledge_item failed');
    }
  }

  // ── Interactive mode ───────────────────────────────────────────────────────
  if (interactive) {
    printSummary();
    console.log(bold('\nInteractive Mode'));
    console.log('Enter a tool name to call it with no arguments, or "exit" to quit.\n');
    const stdinRl = createInterface({ input: process.stdin, output: process.stdout });
    const ask = () => {
      stdinRl.question('tool > ', async (name) => {
        name = name.trim();
        if (name.toLowerCase() === 'exit') {
          stdinRl.close();
          shutdown(false);
          return;
        }
        if (name) {
          try {
            const r = await callTool(mcpProcess, name, {});
            console.log(r?.content?.[0]?.text ?? JSON.stringify(r, null, 2));
          } catch (err) {
            console.log(red(`Error: ${err.message}`));
          }
        }
        ask();
      });
    };
    ask();
    return;
  }

  shutdown(true);

  // ── Helpers ────────────────────────────────────────────────────────────────
  function printSummary() {
    console.log(bold('\n─────────────────────────────────────────────────'));
    const p = green(`${passed} passed`);
    const f = failed  ? red(`${failed} failed`)     : '0 failed';
    const s = skipped ? yellow(`${skipped} skipped`) : '0 skipped';
    console.log(`  ${p}  ${f}  ${s}`);
    if (failures.length) {
      console.log(bold('\nFailures:'));
      for (const { name, error } of failures) {
        console.log(`  ${red('✗')} ${name}`);
        console.log(`    ${error}`);
      }
    }
    console.log('');
  }

  function shutdown(exit = true) {
    printSummary();
    mcpProcess.kill();
    if (exit) process.exit(failed > 0 ? 1 : 0);
  }
}

process.on('uncaughtException',   (err) => { console.error(red(`Uncaught: ${err.message}`));   process.exit(1); });
process.on('unhandledRejection',  (err) => { console.error(red(`Unhandled: ${err}`));           process.exit(1); });

main().catch((err) => { console.error(red(`Fatal: ${err.message}`)); process.exit(1); });
