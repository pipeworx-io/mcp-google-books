interface McpToolDefinition {
  name: string;
  description: string;
  inputSchema: {
    type: 'object';
    properties: Record<string, unknown>;
    required?: string[];
  };
}

interface McpToolExport {
  tools: McpToolDefinition[];
  callTool: (name: string, args: Record<string, unknown>) => Promise<unknown>;
  meter?: { credits: number };
  cost?: Record<string, unknown>;
  provider?: string;
}

/**
 * Google Books MCP
 *
 * Public reads keyless (1k req/day per IP). Optional key for higher limits.
 *
 * Docs: https://developers.google.com/books
 */


const BASE = 'https://www.googleapis.com/books/v1';

const tools: McpToolExport['tools'] = [
  {
    name: 'search',
    description:
      'AUTHORITATIVE book lookup via Google Books — full-text search across ~40M books. Use for "find books about X", "books by author Y", verifying ISBNs, finding publishers, getting cover images, or pulling structured book metadata an LLM would otherwise have to hallucinate. Returns title, authors, publisher, publish date, description, ISBN, page count, cover thumbnails, language. Use search_field scoping: intitle:, inauthor:, inpublisher:, subject:, isbn:, lccn:, oclc:.',
    inputSchema: {
      type: 'object',
      properties: {
        query: { type: 'string', description: 'Search query' },
        search_field: {
          type: 'string',
          description: 'intitle | inauthor | inpublisher | subject | isbn | lccn | oclc — applied as a prefix to query',
        },
        filter: {
          type: 'string',
          description: 'partial | full | free-ebooks | paid-ebooks | ebooks',
        },
        language: { type: 'string', description: 'ISO 639-1 (en, fr, ja, ...)' },
        print_type: { type: 'string', description: 'all (default) | books | magazines' },
        order_by: { type: 'string', description: 'relevance (default) | newest' },
        limit: { type: 'number', description: '1-40 (default 10)' },
        offset: { type: 'number', description: '0-based offset (startIndex)' },
      },
      required: ['query'],
    },
  },
  {
    name: 'get_volume',
    description: 'Volume detail (full title, authors, description, categories, page count, links).',
    inputSchema: {
      type: 'object',
      properties: { id: { type: 'string', description: 'Google Books volume id' } },
      required: ['id'],
    },
  },
  {
    name: 'get_by_isbn',
    description: 'Convenience: look up a volume by ISBN-10 or ISBN-13.',
    inputSchema: {
      type: 'object',
      properties: { isbn: { type: 'string' } },
      required: ['isbn'],
    },
  },
  {
    name: 'list_bookshelf',
    description: 'Fetch the public bookshelves for a Google account (by numeric user_id). Omit shelf to list all public shelves; provide a numeric shelf id to list the volumes on that specific shelf.',
    inputSchema: {
      type: 'object',
      properties: {
        user_id: { type: 'string', description: 'Google account numeric user id' },
        shelf: { type: 'string', description: 'Shelf id (numeric) — omit to list all public shelves' },
      },
      required: ['user_id'],
    },
  },
];

async function callTool(name: string, args: Record<string, unknown>): Promise<unknown> {
  const apiKey = (args._apiKey as string | undefined)?.trim();
  switch (name) {
    case 'search':
      return search(apiKey, args);
    case 'get_volume':
      return gbGet(apiKey, `/volumes/${encodeURIComponent(reqStr(args, 'id', '"zyTCAlFPjgYC"'))}`);
    case 'get_by_isbn': {
      const isbn = reqStr(args, 'isbn', '"9780140449266"').replace(/[-\s]/g, '');
      return search(apiKey, { query: `isbn:${isbn}`, limit: 1 });
    }
    case 'list_bookshelf': {
      const userId = reqStr(args, 'user_id', '"1234567890"');
      const shelf = (args.shelf as string | undefined)?.trim();
      const path = shelf ? `/users/${encodeURIComponent(userId)}/bookshelves/${encodeURIComponent(shelf)}/volumes` : `/users/${encodeURIComponent(userId)}/bookshelves`;
      return gbGet(apiKey, path);
    }
    default:
      throw new Error(`Unknown tool: ${name}`);
  }
}

async function search(apiKey: string | undefined, args: Record<string, unknown>) {
  let q = reqStr(args, 'query', '"the great gatsby"');
  const field = (args.search_field as string | undefined)?.trim();
  if (field && !q.includes(':')) q = `${field}:${q}`;
  const params = new URLSearchParams({
    q,
    maxResults: String(Math.min(40, Math.max(1, (args.limit as number) ?? 10))),
    startIndex: String(Math.max(0, (args.offset as number) ?? 0)),
  });
  if (args.filter) params.set('filter', String(args.filter));
  if (args.language) params.set('langRestrict', String(args.language));
  if (args.print_type) params.set('printType', String(args.print_type));
  if (args.order_by) params.set('orderBy', String(args.order_by));
  if (apiKey) params.set('key', apiKey);
  return gbGet(apiKey, `/volumes?${params}`);
}

async function gbGet(apiKey: string | undefined, path: string) {
  const sep = path.includes('?') ? '&' : '?';
  const url = `${BASE}${path}${apiKey && !path.includes('key=') ? `${sep}key=${encodeURIComponent(apiKey)}` : ''}`;
  const res = await fetch(url, { headers: { Accept: 'application/json' } });
  if (res.status === 401 || res.status === 403) throw new Error('Google Books: unauthorized — check key');
  if (res.status === 404) throw new Error('Google Books: not found');
  if (res.status === 429) throw new Error('Google Books: rate-limit (HTTP 429)');
  if (!res.ok) {
    const t = await res.text();
    throw new Error(`Google Books error: ${res.status} ${t.slice(0, 200)}`);
  }
  return res.json();
}

function reqStr(args: Record<string, unknown>, key: string, example: string): string {
  const v = args[key];
  if (typeof v !== 'string' || !v.trim()) {
    throw new Error(`Required argument "${key}" is missing. Pass a string like ${example}.`);
  }
  return v;
}

export default { tools, callTool, meter: { credits: 1 } } satisfies McpToolExport;
