import { lookup } from 'node:dns/promises';
import { isIP } from 'node:net';
import { Injectable } from '@nestjs/common';
import { SafeNetworkError } from '../domain/crawler-errors';
import {
  RedirectEvidence,
  SafeNetworkGateway,
  SafeNetworkRequest,
  SafeNetworkResponse,
} from '../domain/crawler-types';
import { createDeadlineSignal } from '../domain/deadline-signal';

export type DnsLookup = (
  hostname: string,
) => Promise<Array<{ address: string; family: 4 | 6 }>>;

export type FetchLike = (
  url: string,
  init: RequestInit,
) => Promise<Response>;

const forbiddenRequestHeaders = new Set([
  'authorization',
  'cookie',
  'proxy-authorization',
]);

@Injectable()
export class SafeNetworkGatewayService implements SafeNetworkGateway {
  constructor(
    private readonly fetchImplementation: FetchLike = globalThis.fetch.bind(
      globalThis,
    ),
    private readonly dnsLookup: DnsLookup = defaultDnsLookup,
  ) {}

  async fetch(request: SafeNetworkRequest): Promise<SafeNetworkResponse> {
    validatePositiveLimit(request.maxBodyBytes, 'maxBodyBytes');
    validatePositiveLimit(
      request.maxResponseHeaderBytes,
      'maxResponseHeaderBytes',
    );
    validateNonNegativeLimit(request.maxRedirects, 'maxRedirects');

    const deadlineSignal = createDeadlineSignal(
      request.deadline,
      request.signal,
    );

    try {
      return await this.fetchWithRedirects(request, deadlineSignal.signal);
    } finally {
      deadlineSignal.dispose();
    }
  }

  private async fetchWithRedirects(
    request: SafeNetworkRequest,
    signal: AbortSignal,
  ): Promise<SafeNetworkResponse> {
    let currentUrl = await this.validateUrl(request.url);
    const redirectChain: RedirectEvidence[] = [];

    for (let redirectCount = 0; ; redirectCount += 1) {
      await this.assertHostIsSafe(currentUrl);
      const response = await this.fetchImplementation(currentUrl.href, {
        method: request.method,
        headers: sanitizeRequestHeaders(request.headers),
        redirect: 'manual',
        signal,
      });

      const headers = sanitizeResponseHeaders(
        response.headers,
        request.maxResponseHeaderBytes,
      );

      if (isRedirect(response.status)) {
        if (redirectCount >= request.maxRedirects) {
          throw new SafeNetworkError('Redirect limit exceeded');
        }
        const location = response.headers.get('location');
        if (!location) {
          throw new SafeNetworkError('Redirect response missing location header');
        }
        const nextUrl = await this.validateUrl(
          new URL(location, currentUrl).href,
        );
        redirectChain.push({
          fromUrl: currentUrl.href,
          toUrl: nextUrl.href,
          statusCode: response.status,
        });
        currentUrl = nextUrl;
        continue;
      }

      const body =
        request.method === 'HEAD'
          ? new Uint8Array()
          : await readBoundedBody(response, request.maxBodyBytes);

      return {
        finalUrl: currentUrl.href,
        statusCode: response.status,
        headers,
        body,
        redirectChain,
      };
    }
  }

  private async validateUrl(value: string): Promise<URL> {
    let url: URL;
    try {
      url = new URL(value);
    } catch {
      throw new SafeNetworkError('URL must be structurally valid');
    }

    if (url.protocol !== 'http:' && url.protocol !== 'https:') {
      throw new SafeNetworkError('Only http and https URLs are allowed');
    }
    if (!url.hostname) {
      throw new SafeNetworkError('URL hostname is required');
    }

    return url;
  }

  private async assertHostIsSafe(url: URL): Promise<void> {
    const addresses =
      isIP(url.hostname) === 0
        ? await this.dnsLookup(url.hostname)
        : [{ address: url.hostname, family: isIP(url.hostname) as 4 | 6 }];

    if (addresses.length === 0) {
      throw new SafeNetworkError('Hostname did not resolve');
    }

    for (const entry of addresses) {
      if (isUnsafeIp(entry.address)) {
        throw new SafeNetworkError('Resolved address is not publicly routable');
      }
    }
  }
}

async function defaultDnsLookup(
  hostname: string,
): Promise<Array<{ address: string; family: 4 | 6 }>> {
  const entries = await lookup(hostname, { all: true });
  return entries.map((entry) => ({
    address: entry.address,
    family: entry.family === 6 ? 6 : 4,
  }));
}

function sanitizeRequestHeaders(
  headers: Record<string, string> | undefined,
): Record<string, string> {
  const sanitized: Record<string, string> = {};
  for (const [key, value] of Object.entries(headers ?? {})) {
    const normalizedKey = key.trim().toLowerCase();
    if (!normalizedKey || forbiddenRequestHeaders.has(normalizedKey)) {
      continue;
    }
    sanitized[normalizedKey] = boundHeaderValue(value);
  }
  return sanitized;
}

function sanitizeResponseHeaders(
  headers: Headers,
  maxHeaderBytes: number,
): Record<string, string> {
  const sanitized: Record<string, string> = {};
  let totalBytes = 0;

  for (const [key, value] of headers.entries()) {
    const normalizedKey = key.trim().toLowerCase();
    const normalizedValue = boundHeaderValue(value);
    totalBytes += normalizedKey.length + normalizedValue.length;
    if (totalBytes > maxHeaderBytes) {
      throw new SafeNetworkError('Response headers exceed configured limit');
    }
    sanitized[normalizedKey] = normalizedValue;
  }

  return sanitized;
}

async function readBoundedBody(
  response: Response,
  maxBodyBytes: number,
): Promise<Uint8Array> {
  const body = new Uint8Array(await response.arrayBuffer());
  if (body.byteLength > maxBodyBytes) {
    throw new SafeNetworkError('Response body exceeds configured limit');
  }
  return body;
}

function boundHeaderValue(value: string): string {
  return value.trim().slice(0, 2000);
}

function isRedirect(statusCode: number): boolean {
  return [301, 302, 303, 307, 308].includes(statusCode);
}

function validatePositiveLimit(value: number, field: string): void {
  if (!Number.isInteger(value) || value < 1) {
    throw new SafeNetworkError(`${field} must be a positive integer`);
  }
}

function validateNonNegativeLimit(value: number, field: string): void {
  if (!Number.isInteger(value) || value < 0) {
    throw new SafeNetworkError(`${field} must be a non-negative integer`);
  }
}

function isUnsafeIp(address: string): boolean {
  return isUnsafeIpv4(address) || isUnsafeIpv6(address);
}

function isUnsafeIpv4(address: string): boolean {
  const parts = address.split('.').map((part) => Number(part));
  if (parts.length !== 4 || parts.some((part) => !Number.isInteger(part))) {
    return false;
  }
  const [first, second] = parts;
  return (
    first === 0 ||
    first === 10 ||
    first === 127 ||
    (first === 100 && second >= 64 && second <= 127) ||
    (first === 169 && second === 254) ||
    (first === 172 && second >= 16 && second <= 31) ||
    (first === 192 && second === 168) ||
    (first === 198 && (second === 18 || second === 19)) ||
    first >= 224
  );
}

function isUnsafeIpv6(address: string): boolean {
  const normalized = address.toLowerCase();
  return (
    normalized === '::1' ||
    normalized === '::' ||
    normalized.startsWith('fc') ||
    normalized.startsWith('fd') ||
    normalized.startsWith('fe80') ||
    normalized.startsWith('ff')
  );
}
