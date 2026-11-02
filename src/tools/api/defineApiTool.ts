import { McpServer } from "@modelcontextprotocol/server";
import { z } from 'zod';
import { callPublicApi, downloadFileFromPublicApi, uploadFilesToPublicApi } from '../../client';
import type { JsonValue } from '../../types';

type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

/** Timeout for endpoints that call a language model before responding. */
export const AI_TIMEOUT_MS = 120_000;

/**
 * One Public API operation exposed as an MCP tool. Input fields named like a `{placeholder}` in
 * `path` fill it; for GET the remaining fields become the query string, otherwise the JSON body
 * (fields listed in `query` go to the query string instead).
 */
export interface ApiToolDefinition {
  name: string;
  description: string;
  method: HttpMethod;
  path: string;
  input?: z.ZodRawShape;
  query?: readonly string[];
  /** Send this one field's value as the whole JSON body (for endpoints that take an array). */
  bodyField?: string;
  timeoutMs?: number;
  /** Retries on 429/5xx/timeouts. Defaults to 0 for POST, whose replay could act twice. */
  retries?: number;
  /**
   * Multipart upload of local files (local stdio mode only). The tool takes `filePath` (or
   * `filePaths` when `multiple`) and sends the other non-path fields as form fields.
   */
  upload?: { field: string; multiple?: boolean };
  /** Binary download saved to a local directory (local stdio mode only). */
  download?: { fallbackName: string };
  /**
   * Overrides destructiveHint, which defaults to true for PUT, PATCH and DELETE and false for POST.
   * Set it on a POST that changes or replaces existing data (approve, close, merge, move, upsert...).
   */
  destructive?: boolean;
  /** Overrides idempotentHint, which defaults to true for GET, PUT, PATCH and DELETE (e.g. a PUT that saves a new revision). */
  idempotent?: boolean;
}

const PLACEHOLDER = /\{(\w+)\}/g;

function placeholders(path: string): string[] {
  return [...path.matchAll(PLACEHOLDER)].map((m) => m[1]);
}

function fillPath(path: string, input: Record<string, unknown>): string {
  return path.replace(PLACEHOLDER, (_, name: string) => encodeURIComponent(String(input[name])));
}

function appendQuery(params: URLSearchParams, key: string, value: unknown): void {
  if (value === undefined || value === null) return;
  if (Array.isArray(value)) {
    for (const item of value) appendQuery(params, key, item);
  } else if (typeof value === 'object') {
    params.append(key, JSON.stringify(value));
  } else {
    params.append(key, String(value));
  }
}

function formValue(value: unknown): string {
  return typeof value === 'object' ? JSON.stringify(value) : String(value);
}

async function runApiTool(def: ApiToolDefinition, input: Record<string, unknown>): Promise<unknown> {
  const pathFields = new Set(placeholders(def.path));
  const queryFields = new Set(def.query ?? []);
  const params = new URLSearchParams();
  const body: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(input)) {
    if (pathFields.has(key) || value === undefined) continue;
    if (key === 'filePath' || key === 'filePaths' || key === 'outputDirectory') continue;
    if (def.method === 'GET' || queryFields.has(key)) appendQuery(params, key, value);
    else body[key] = value;
  }

  const qs = params.toString();
  const path = `${fillPath(def.path, input)}${qs ? `?${qs}` : ''}`;

  if (def.download) {
    return downloadFileFromPublicApi(path, String(input.outputDirectory ?? '~/Downloads'), def.download.fallbackName);
  }
  if (def.upload) {
    const files = def.upload.multiple ? (input.filePaths as string[]) : [input.filePath as string];
    const fields = Object.fromEntries(
      Object.entries(body)
        .filter(([, value]) => value !== null)
        .map(([key, value]) => [key, formValue(value)]),
    );
    return uploadFilesToPublicApi(path, def.method, def.upload.field, files, fields);
  }

  let payload: unknown;
  if (def.bodyField) payload = input[def.bodyField];
  else if (Object.keys(body).length > 0 || def.method === 'POST' || def.method === 'PUT' || def.method === 'PATCH') {
    payload = body;
  }

  return callPublicApi<JsonValue>(
    path,
    { method: def.method, ...(payload === undefined ? {} : { body: JSON.stringify(payload) }) },
    def.retries ?? (def.method === 'POST' ? 0 : undefined),
    def.timeoutMs,
  );
}

function inputSchemaOf(def: ApiToolDefinition): z.ZodRawShape {
  const shape: Record<string, z.core.$ZodType> = { ...(def.input ?? {}) };
  for (const name of placeholders(def.path)) {
    shape[name] ??= z.string().min(1).describe(`${name} path parameter`);
  }
  if (def.upload?.multiple) {
    shape.filePaths = z.array(z.string().min(1)).min(1).describe('Local paths of the files to upload');
  } else if (def.upload) {
    shape.filePath = z.string().min(1).describe('Local path of the file to upload');
  }
  if (def.download) {
    shape.outputDirectory = z
      .string()
      .optional()
      .describe('Local directory to save the file in (default ~/Downloads). Existing files are never overwritten.');
  }
  return shape;
}

type ToolAnnotations = { readOnlyHint: boolean; destructiveHint: boolean; idempotentHint: boolean };

/** A download is a GET that writes a new local file on every call, so it is neither read-only nor idempotent. */
function annotationsOf(def: ApiToolDefinition): ToolAnnotations {
  if (def.download) return { readOnlyHint: false, destructiveHint: false, idempotentHint: false };
  if (def.method === 'GET') return { readOnlyHint: true, destructiveHint: false, idempotentHint: true };
  return {
    readOnlyHint: false,
    destructiveHint: def.destructive ?? def.method !== 'POST',
    idempotentHint: def.idempotent ?? def.method !== 'POST',
  };
}

type ToolResult = { content: { type: 'text'; text: string }[]; isError?: boolean };

/**
 * registerTool infers the callback argument from inputSchema. A non-literal Zod shape makes that
 * inference hit TS2589 and exhaust memory, so this one call site is typed loosely.
 */
type RegisterLooseTool = (
  name: string,
  config: {
    description: string;
    inputSchema: z.ZodObject;
    annotations: ToolAnnotations;
  },
  callback: (input: Record<string, unknown>) => Promise<ToolResult>,
) => void;

export function registerApiTool(server: McpServer, def: ApiToolDefinition): void {
  const registerTool = server.registerTool.bind(server) as unknown as RegisterLooseTool;
  registerTool(
    def.name,
    {
      description: def.description,
      inputSchema: z.object(inputSchemaOf(def)),
      annotations: annotationsOf(def),
    },
    async (input) => {
      try {
        const data = await runApiTool(def, input);
        const result = data === undefined ? { ok: true } : data;
        return { content: [{ type: 'text' as const, text: JSON.stringify(result, null, 2) }] };
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
        return {
          content: [{ type: 'text' as const, text: `Error in ${def.name}: ${errorMessage}` }],
          isError: true,
        };
      }
    },
  );
}
