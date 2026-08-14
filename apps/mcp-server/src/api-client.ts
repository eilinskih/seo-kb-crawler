export interface SeoKbApiClientOptions {
  baseUrl?: string;
  timeoutMs?: number;
}

export class SeoKbApiClient {
  private readonly baseUrl: string;
  private readonly timeoutMs: number;

  constructor(options: SeoKbApiClientOptions = {}) {
    this.baseUrl = (options.baseUrl ??
      process.env.SEO_KB_API_BASE_URL ??
      'http://127.0.0.1:3000').replace(/\/+$/u, '');
    this.timeoutMs = positiveInteger(
      options.timeoutMs ?? process.env.SEO_KB_MCP_TIMEOUT_MS,
      30_000,
    );
  }

  async get(path: string): Promise<unknown> {
    return this.request('GET', path);
  }

  async post(path: string, body?: unknown): Promise<unknown> {
    return this.request('POST', path, body);
  }

  private async request(
    method: 'GET' | 'POST',
    path: string,
    body?: unknown,
  ): Promise<unknown> {
    const response = await fetch(`${this.baseUrl}${path}`, {
      method,
      headers: body === undefined
        ? undefined
        : { 'content-type': 'application/json' },
      body: body === undefined ? undefined : JSON.stringify(body),
      signal: AbortSignal.timeout(this.timeoutMs),
    });
    const responseBody = await readBody(response);

    if (!response.ok) {
      throw new Error(
        `${method} ${path} failed with HTTP ${response.status}: ${formatBody(responseBody)}`,
      );
    }

    return responseBody;
  }
}

async function readBody(response: Response): Promise<unknown> {
  const text = await response.text();
  if (!text) {
    return null;
  }
  try {
    return JSON.parse(text) as unknown;
  } catch {
    return text;
  }
}

function formatBody(body: unknown): string {
  return typeof body === 'string' ? body : JSON.stringify(body);
}

function positiveInteger(value: string | number | undefined, fallback: number): number {
  const parsed = typeof value === 'number' ? value : Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
}
