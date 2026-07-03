import { Injectable } from '@nestjs/common';
import { SafeNetworkError } from '../domain/crawler-errors';
import { evaluateTopicCrawlPolicy } from '../domain/topic-policy';
import {
  CrawlAdapterResult,
  CrawlExecutionContext,
  CrawlerAdapter,
  CrawlerAdapterCapabilities,
  ExtractedCrawlLink,
  SafeNetworkResponse,
  TopicCrawlPolicySnapshot,
} from '../domain/crawler-types';

const maxSupportedBodyBytes = 5_000_000;
const maxSupportedExecutionMs = 60_000;

@Injectable()
export class HttpFetchAdapter implements CrawlerAdapter {
  readonly key = 'http-fetch';
  readonly version = '1.0.0';
  readonly capabilities: CrawlerAdapterCapabilities = {
    supportsJavaScriptRendering: false,
    supportsMarkdownExtraction: false,
    supportsPlainTextExtraction: true,
    supportsScreenshot: false,
    supportsNetworkIdle: false,
    supportsRobotsAwareFetch: true,
    maximumBodyBytes: maxSupportedBodyBytes,
    maximumExecutionMs: maxSupportedExecutionMs,
  };

  async crawl(context: CrawlExecutionContext): Promise<CrawlAdapterResult> {
    const startedAt = Date.now();
    const response = await fetchHtml(context, startedAt);
    if ('status' in response) {
      return response;
    }

    const redirectPolicy = evaluateTopicCrawlPolicy(
      response.finalUrl,
      topicPolicyFromContext(context),
      'redirect',
    );

    if (!redirectPolicy.allowed) {
      return {
        status: 'blocked_by_policy',
        finalUrl: response.finalUrl,
        statusCode: response.statusCode,
        headers: response.headers,
        redirectChain: response.redirectChain,
        timing: totalTiming(startedAt),
        failure: {
          category: 'policy_redirect_blocked',
          detail: redirectPolicy.evidence,
          retryable: false,
        },
      };
    }

    if (!isHtmlResponse(response.headers)) {
      return {
        status: 'failed_terminal',
        finalUrl: response.finalUrl,
        statusCode: response.statusCode,
        headers: response.headers,
        redirectChain: response.redirectChain,
        timing: totalTiming(startedAt),
        failure: {
          category: 'unsupported_content_type',
          detail: `Unsupported content type: ${contentType(response.headers) ?? 'unknown'}`,
          retryable: false,
        },
      };
    }

    const html = decodeBody(response.body, response.headers);
    const canonicalUrl = allowedCanonicalUrl(
      extractCanonicalUrl(html, response.finalUrl),
      context,
    );

    return {
      status: statusFromHttpCode(response.statusCode),
      finalUrl: response.finalUrl,
      statusCode: response.statusCode,
      headers: response.headers,
      redirectChain: response.redirectChain,
      canonicalUrl,
      title: extractTitle(html),
      metaDescription: extractMetaDescription(html),
      rawHtml: html,
      plainText: extractPlainText(html),
      outgoingLinks: extractOutgoingLinks(
        html,
        response.finalUrl,
        context.command.policy.maxOutgoingLinks,
      ),
      timing: totalTiming(startedAt),
      failure: failureFromHttpCode(response.statusCode),
    };
  }
}

async function fetchHtml(
  context: CrawlExecutionContext,
  startedAt: number,
): Promise<SafeNetworkResponse | CrawlAdapterResult> {
  try {
    return await context.safeNetworkGateway.fetch({
      url: context.command.normalizedUrl,
      method: 'GET',
      headers: {
        'user-agent': context.command.policy.userAgent,
        accept: 'text/html,application/xhtml+xml',
      },
      deadline: context.deadline,
      signal: context.signal,
      maxBodyBytes: context.command.policy.maxBodyBytes,
      maxRedirects: context.command.policy.maxRedirects,
      maxResponseHeaderBytes: 16_000,
    });
  } catch (error) {
    return safeNetworkFailure(error, context.signal, startedAt);
  }
}

function safeNetworkFailure(
  error: unknown,
  signal: AbortSignal,
  startedAt: number,
): CrawlAdapterResult {
  const detail =
    error instanceof Error ? error.message : 'Safe network fetch failed';
  if (signal.aborted) {
    return {
      status: 'timed_out',
      timing: totalTiming(startedAt),
      failure: {
        category: 'network_timeout',
        detail,
        retryable: true,
      },
    };
  }

  if (error instanceof SafeNetworkError) {
    return {
      status: safeNetworkFailureStatus(error.message),
      timing: totalTiming(startedAt),
      failure: {
        category: safeNetworkFailureCategory(error.message),
        detail,
        retryable: safeNetworkFailureRetryable(error.message),
      },
    };
  }

  return {
    status: 'failed_retryable',
    timing: totalTiming(startedAt),
    failure: {
      category: 'connection_failure',
      detail,
      retryable: true,
    },
  };
}

function topicPolicyFromContext(
  context: CrawlExecutionContext,
): TopicCrawlPolicySnapshot {
  return {
    allowedHosts: context.command.policy.allowedHosts ?? [],
    deniedHosts: context.command.policy.deniedHosts ?? [],
    includedPathPatterns: context.command.policy.includedPathPatterns ?? [],
    excludedPathPatterns: context.command.policy.excludedPathPatterns ?? [],
    crossHostCanonicalPolicy:
      context.command.policy.crossHostCanonicalPolicy ?? 'same-host',
  };
}

function isHtmlResponse(headers: Record<string, string>): boolean {
  const type = contentType(headers);
  return (
    !type ||
    type.includes('text/html') ||
    type.includes('application/xhtml+xml')
  );
}

function contentType(headers: Record<string, string>): string | undefined {
  return headers['content-type']?.toLowerCase();
}

function decodeBody(body: Uint8Array, headers: Record<string, string>): string {
  const charset =
    contentType(headers)?.match(/charset=([^;\s]+)/i)?.[1] ?? 'utf-8';
  try {
    return new TextDecoder(charset).decode(body);
  } catch {
    return new TextDecoder('utf-8').decode(body);
  }
}

function statusFromHttpCode(statusCode: number): CrawlAdapterResult['status'] {
  if (statusCode === 429 || statusCode >= 500) {
    return 'failed_retryable';
  }
  if (statusCode >= 400) {
    return 'failed_terminal';
  }
  return 'succeeded';
}

function failureFromHttpCode(
  statusCode: number,
): CrawlAdapterResult['failure'] {
  if (statusCode === 429) {
    return {
      category: 'http_429',
      detail: 'HTTP 429 Too Many Requests',
      retryable: true,
    };
  }
  if (statusCode >= 500) {
    return {
      category: 'http_5xx',
      detail: `HTTP ${statusCode} server error`,
      retryable: true,
    };
  }
  if (statusCode >= 400) {
    return {
      category: 'adapter_error',
      detail: `HTTP ${statusCode} client error`,
      retryable: false,
    };
  }
  return undefined;
}

function safeNetworkFailureStatus(
  message: string,
): CrawlAdapterResult['status'] {
  if (safeNetworkFailureCategory(message) === 'unsafe_target') {
    return 'blocked_by_policy';
  }
  if (safeNetworkFailureRetryable(message)) {
    return 'failed_retryable';
  }
  return 'failed_terminal';
}

function safeNetworkFailureCategory(
  message: string,
): NonNullable<CrawlAdapterResult['failure']>['category'] {
  const normalized = message.toLowerCase();
  if (
    normalized.includes('publicly routable') ||
    normalized.includes('only http and https') ||
    normalized.includes('url must') ||
    normalized.includes('hostname')
  ) {
    return 'unsafe_target';
  }
  if (normalized.includes('redirect')) {
    return 'policy_redirect_blocked';
  }
  if (normalized.includes('body exceeds')) {
    return 'content_too_large';
  }
  if (normalized.includes('headers exceed')) {
    return 'content_too_large';
  }
  return 'connection_failure';
}

function safeNetworkFailureRetryable(message: string): boolean {
  return safeNetworkFailureCategory(message) === 'connection_failure';
}

function extractTitle(html: string): string | undefined {
  const match = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  return match ? decodeHtmlText(match[1]) : undefined;
}

function extractMetaDescription(html: string): string | undefined {
  const match = html.match(/<meta\b([^>]*)>/gi)?.find((tag) => {
    const name = readHtmlAttribute(tag, 'name');
    return name?.toLowerCase() === 'description';
  });
  const content = match ? readHtmlAttribute(match, 'content') : undefined;
  return content ? decodeHtmlText(content) : undefined;
}

function extractCanonicalUrl(
  html: string,
  baseUrl: string,
): string | undefined {
  const match = html.match(/<link\b([^>]*)>/gi)?.find((tag) => {
    const rel = readHtmlAttribute(tag, 'rel');
    return rel?.split(/\s+/).some((token) => token.toLowerCase() === 'canonical');
  });
  const href = match ? readHtmlAttribute(match, 'href') : undefined;
  if (!href) {
    return undefined;
  }
  return resolveHttpUrl(href, baseUrl);
}

function allowedCanonicalUrl(
  canonicalUrl: string | undefined,
  context: CrawlExecutionContext,
): string | undefined {
  if (!canonicalUrl) {
    return undefined;
  }
  const decision = evaluateTopicCrawlPolicy(
    canonicalUrl,
    topicPolicyFromContext(context),
    'canonical',
  );
  return decision.allowed ? canonicalUrl : undefined;
}

function extractOutgoingLinks(
  html: string,
  baseUrl: string,
  maxLinks: number,
): ExtractedCrawlLink[] {
  const links: ExtractedCrawlLink[] = [];
  const linkPattern = /<a\b([^>]*)>([\s\S]*?)<\/a>/gi;

  for (const match of html.matchAll(linkPattern)) {
    if (links.length >= maxLinks) {
      break;
    }
    const href = readHtmlAttribute(match[1], 'href');
    if (!href) {
      continue;
    }
    const resolvedUrl = resolveHttpUrl(href, baseUrl);
    if (!resolvedUrl) {
      continue;
    }
    links.push({
      href: href.trim(),
      resolvedUrl,
      anchorText: decodeHtmlText(stripTags(match[2])),
      rel: extractRelTokens(match[1]),
      sourceElement: 'a',
      position: links.length,
    });
  }

  return links;
}

function extractRelTokens(attributes: string): string[] | undefined {
  const rel = readHtmlAttribute(attributes, 'rel');
  if (!rel) {
    return undefined;
  }
  const tokens = rel.split(/\s+/).filter(Boolean);
  return tokens.length > 0 ? tokens : undefined;
}

function readHtmlAttribute(tag: string, attributeName: string): string | undefined {
  const pattern = new RegExp(
    `\\b${attributeName}\\s*=\\s*(?:"([^"]*)"|'([^']*)'|([^\\s"'>]+))`,
    'i',
  );
  const match = tag.match(pattern);
  return match?.[1] ?? match?.[2] ?? match?.[3];
}

function extractPlainText(html: string): string {
  return decodeHtmlText(
    stripTags(
      html
        .replace(/<script\b[\s\S]*?<\/script>/gi, ' ')
        .replace(/<style\b[\s\S]*?<\/style>/gi, ' '),
    ),
  );
}

function stripTags(value: string): string {
  return value.replace(/<[^>]+>/g, ' ');
}

function decodeHtmlText(value: string): string {
  return value
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, ' ')
    .trim();
}

function resolveHttpUrl(value: string, baseUrl: string): string | undefined {
  let url: URL;
  try {
    url = new URL(value.trim(), baseUrl);
  } catch {
    return undefined;
  }
  if (url.protocol !== 'http:' && url.protocol !== 'https:') {
    return undefined;
  }
  return url.href;
}

function totalTiming(startedAt: number): { totalMs: number } {
  return {
    totalMs: Math.max(0, Date.now() - startedAt),
  };
}
