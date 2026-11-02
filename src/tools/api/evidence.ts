import { z } from 'zod';
import { optionalNonEmptyStringArraySchema } from '../../coerceArrays';
import { AI_TIMEOUT_MS } from './defineApiTool';
import type { ApiToolDefinition } from './defineApiTool';

const DOC_TYPES = ['spec', 'design', 'procedure', 'vendor_manual', 'contract', 'other'] as const;

const documentId = z.string().uuid().describe('Evidence document (version) UUID');
const docType = z.enum(DOC_TYPES).describe('Document type');
const includeOld = z.boolean().optional().describe('Also include non-current versions (default false)');
const serviceId = z.string().uuid().optional().describe('Only documents linked to this service UUID');
const documentDate = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/)
  .describe('Date of the document (YYYY-MM-DD)');

export const evidenceTools: ApiToolDefinition[] = [
  {
    name: 'list_evidence_documents',
    description:
      'List documents in the evidence library (specs, designs, procedures, vendor manuals, contracts), current versions only unless includeOld. Returns metadata, page counts and OCR status.',
    method: 'GET',
    path: '/v1/evidence-library/documents',
    input: {
      q: z.string().optional().describe('Text to match in the document metadata'),
      docType: docType.optional(),
      serviceId,
      includeOld,
    },
  },
  {
    name: 'upload_evidence_document',
    description:
      'Upload a PDF (max 100MB) to the evidence library. Omitted metadata is taken from the PDF or, with replacesDocumentId, from the previous version, which this upload supersedes. Scanned pages are OCRed in the background (AI; consumes credits).',
    method: 'POST',
    path: '/v1/evidence-library/documents',
    upload: { field: 'file' },
    input: {
      title: z.string().min(1).max(255).optional().describe('Title (default: PDF title or file name)'),
      description: z.string().max(5000).optional().describe('Description'),
      docType: docType.optional().describe('Document type (default other)'),
      versionLabel: z.string().max(100).optional().describe('Version label (e.g. v2.1)'),
      documentDate: documentDate.optional(),
      vendor: z.string().max(255).optional().describe('Vendor or author organization'),
      serviceIds: optionalNonEmptyStringArraySchema.describe('Service UUIDs the document relates to'),
      ownerMemberId: z.string().uuid().optional().describe('Tenant member UUID owning the document (default caller)'),
      replacesDocumentId: z
        .string()
        .uuid()
        .optional()
        .describe('Evidence document UUID this file is a new version of'),
    },
  },
  {
    name: 'suggest_evidence_metadata',
    description:
      "Suggest metadata (title, type, vendor, version, date, services, description) for a document from its file name, PDF properties and the text of its first pages. Nothing is saved. (AI; consumes credits)",
    method: 'POST',
    path: '/v1/evidence-library/suggest-metadata',
    timeoutMs: AI_TIMEOUT_MS,
    input: {
      filename: z.string().min(1).max(500).describe('File name of the document'),
      pageCount: z.number().int().min(1).optional().describe('Total number of pages'),
      pdfTitle: z.string().max(500).optional().describe('Title from the PDF properties'),
      pdfAuthor: z.string().max(500).optional().describe('Author from the PDF properties'),
      pdfSubject: z.string().max(500).optional().describe('Subject from the PDF properties'),
      // The endpoint is multipart-first and reads `pages` only as a JSON-encoded string.
      pages: z
        .array(z.string())
        .max(5)
        .optional()
        .transform((pages) => (pages === undefined ? undefined : JSON.stringify(pages)))
        .describe('Text of the first pages, one string per page (max 5 pages, 4000 chars each)'),
    },
  },
  {
    name: 'search_evidence_library',
    description:
      'Search evidence library pages by keywords (hybrid keyword and semantic search). Returns matching pages with snippets, document titles and page numbers; at most 5 pages per document unless documentId is set.',
    method: 'GET',
    path: '/v1/evidence-library/search',
    input: {
      q: z.string().min(1).max(500).describe('Search keywords or question'),
      documentId: z.string().uuid().optional().describe('Only search this evidence document UUID'),
      docType: docType.optional(),
      serviceId,
      includeOld,
      limit: z.number().int().min(1).max(50).optional().describe('Max hits (default 20, max 50)'),
    },
  },
  {
    name: 'get_evidence_document',
    description: 'Get one evidence document: metadata, version info, page count and OCR status.',
    method: 'GET',
    path: '/v1/evidence-library/documents/{documentId}',
    input: { documentId },
  },
  {
    name: 'update_evidence_document',
    description:
      'Update the metadata of an evidence document; only sent fields change, null clears a nullable field. Send at least one field.',
    method: 'PATCH',
    path: '/v1/evidence-library/documents/{documentId}',
    input: {
      documentId,
      title: z.string().min(1).max(255).optional().describe('Title'),
      description: z.string().max(5000).nullable().optional().describe('Description'),
      docType: docType.optional(),
      versionLabel: z.string().max(100).nullable().optional().describe('Version label'),
      documentDate: documentDate.nullable().optional(),
      vendor: z.string().max(255).nullable().optional().describe('Vendor or author organization'),
      serviceIds: z.array(z.string().uuid()).optional().describe('Service UUIDs (replaces the list; [] clears)'),
      ownerMemberId: z.string().uuid().nullable().optional().describe('Tenant member UUID owning the document'),
    },
  },
  {
    name: 'delete_evidence_document',
    description:
      'Delete one version of an evidence document and its file. When it was the current version, the newest remaining version becomes current.',
    method: 'DELETE',
    path: '/v1/evidence-library/documents/{documentId}',
    input: { documentId },
  },
  {
    name: 'download_evidence_document_file',
    description: 'Download the original PDF of an evidence document to a local directory.',
    method: 'GET',
    path: '/v1/evidence-library/documents/{documentId}/file',
    download: { fallbackName: 'evidence-document.pdf' },
    input: { documentId },
  },
  {
    name: 'read_evidence_document_pages',
    description:
      'Read the extracted text of pages of an evidence document, up to 5 pages and about 20,000 characters per call. Returns the pages and whether the text was truncated.',
    method: 'GET',
    path: '/v1/evidence-library/documents/{documentId}/pages',
    input: {
      documentId,
      from: z.number().int().min(1).optional().describe('First page (default 1)'),
      to: z.number().int().min(1).optional().describe('Last page (default from; at most from + 4 is returned)'),
    },
  },
  {
    name: 'set_current_evidence_document_version',
    description:
      'Make this version the current one of its document series (searches and lists use current versions).',
    method: 'POST',
    destructive: true,
    path: '/v1/evidence-library/documents/{documentId}/current',
    input: { documentId },
  },
  {
    name: 'retry_evidence_document_ocr',
    description:
      'Restart OCR for the pages without text of an evidence document after it failed or stalled. Runs in the background; check ocrStatus with get_evidence_document. (AI; consumes credits)',
    method: 'POST',
    path: '/v1/evidence-library/documents/{documentId}/ocr',
    input: { documentId },
  },
];
