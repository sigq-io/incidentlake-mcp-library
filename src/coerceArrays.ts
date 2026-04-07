import { z } from 'zod';

/**
 * MCP clients and LLMs sometimes pass list fields as a single string (comma/semicolon-separated,
 * or a JSON array string) instead of a JSON array. Normalize before Zod validates.
 */
export function coerceInputToStringArray(val: unknown): unknown {
  if (val === undefined || val === null) return val;
  if (Array.isArray(val)) {
    return val
      .map((v) => (typeof v === 'string' ? v.trim() : String(v)))
      .filter((s) => s.length > 0);
  }
  if (typeof val === 'string') {
    const t = val.trim();
    if (t === '') return [];
    if (t.startsWith('[')) {
      try {
        const parsed = JSON.parse(t) as unknown;
        if (Array.isArray(parsed)) {
          return parsed.map((x) => String(x).trim()).filter(Boolean);
        }
      } catch {
        /* fall through to split */
      }
    }
    return t.split(/[\s,;]+/).map((s) => s.trim()).filter(Boolean);
  }
  return val;
}

/** assigneeEmails: null clears; string or string[] accepted from MCP. */
export const optionalNullableEmailArraySchema = z.preprocess(
  coerceInputToStringArray,
  z.array(z.string().email()).nullable().optional(),
);

export const optionalNonEmptyStringArraySchema = z.preprocess(
  coerceInputToStringArray,
  z.array(z.string().min(1)).optional(),
);

export const requiredNonEmptyStringArraySchema = z.preprocess(
  coerceInputToStringArray,
  z.array(z.string().min(1)).min(1),
);

/** Tag list (may be empty to clear). Accepts comma-separated or JSON array string from MCP. */
export const coercedTagArraySchema = z.preprocess(
  coerceInputToStringArray,
  z.array(z.string().min(1)),
);
