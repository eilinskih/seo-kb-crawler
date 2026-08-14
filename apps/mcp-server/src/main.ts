import { SeoKbMcpServer } from './mcp-server';

const server = new SeoKbMcpServer();
let buffer: Buffer<ArrayBufferLike> = Buffer.alloc(0);

process.stdin.on('data', (chunk: Buffer) => {
  buffer = Buffer.concat([buffer, chunk]);
  void drainBuffer();
});

process.stdin.on('error', (error) => {
  console.error(`MCP stdin error: ${error.message}`);
});

async function drainBuffer(): Promise<void> {
  for (;;) {
    const parsed = readMessage(buffer);
    if (!parsed) {
      return;
    }
    buffer = parsed.remaining;
    await handleMessage(parsed.body);
  }
}

async function handleMessage(body: Buffer): Promise<void> {
  try {
    const request = JSON.parse(body.toString('utf8')) as unknown;
    if (!isRequest(request)) {
      writeMessage({
        jsonrpc: '2.0',
        id: null,
        error: {
          code: -32600,
          message: 'Invalid JSON-RPC request',
        },
      });
      return;
    }

    const response = await server.handle(request);
    if (response) {
      writeMessage(response);
    }
  } catch (error) {
    writeMessage({
      jsonrpc: '2.0',
      id: null,
      error: {
        code: -32700,
        message: error instanceof Error ? error.message : String(error),
      },
    });
  }
}

function readMessage(
  input: Buffer<ArrayBufferLike>,
): { body: Buffer<ArrayBufferLike>; remaining: Buffer<ArrayBufferLike> } | null {
  const headerEnd = input.indexOf('\r\n\r\n');
  if (headerEnd === -1) {
    return null;
  }

  const header = input.subarray(0, headerEnd).toString('utf8');
  const contentLength = contentLengthFromHeader(header);
  if (contentLength === null) {
    throw new Error('MCP message is missing Content-Length header');
  }

  const bodyStart = headerEnd + 4;
  const bodyEnd = bodyStart + contentLength;
  if (input.length < bodyEnd) {
    return null;
  }

  return {
    body: input.subarray(bodyStart, bodyEnd),
    remaining: input.subarray(bodyEnd),
  };
}

function contentLengthFromHeader(header: string): number | null {
  for (const line of header.split('\r\n')) {
    const match = /^content-length:\s*(\d+)$/iu.exec(line);
    if (match) {
      return Number(match[1]);
    }
  }
  return null;
}

function writeMessage(message: unknown): void {
  const body = JSON.stringify(message);
  process.stdout.write(`Content-Length: ${Buffer.byteLength(body, 'utf8')}\r\n\r\n${body}`);
}

function isRequest(value: unknown): value is {
  id?: string | number | null;
  method: string;
  params?: unknown;
} {
  return Boolean(value) &&
    typeof value === 'object' &&
    !Array.isArray(value) &&
    typeof (value as { method?: unknown }).method === 'string';
}
