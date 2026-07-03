import {
  TopicCrawlPolicySnapshot,
  TopicPolicyCheckKind,
  TopicPolicyDecision,
} from './crawler-types';

export function evaluateTopicCrawlPolicy(
  url: string,
  policy: TopicCrawlPolicySnapshot,
  kind: TopicPolicyCheckKind = 'request',
  sourceUrl?: string,
): TopicPolicyDecision {
  const target = parseHttpUrl(url);
  const source = sourceUrl ? parseHttpUrl(sourceUrl) : null;
  const host = normalizeHost(target.hostname);

  if (matchesHost(host, policy.deniedHosts)) {
    return denied(target, kind, `denied host: ${host}`);
  }

  if (!matchesHost(host, policy.allowedHosts)) {
    return denied(target, kind, `host not allowed: ${host}`);
  }

  if (
    kind === 'canonical' &&
    source &&
    policy.crossHostCanonicalPolicy === 'same-host' &&
    normalizeHost(source.hostname) !== host
  ) {
    return denied(target, kind, 'cross-host canonical blocked by policy');
  }

  if (
    policy.includedPathPatterns.length > 0 &&
    !matchesPath(target.pathname, policy.includedPathPatterns)
  ) {
    return denied(target, kind, `path not included: ${target.pathname}`);
  }

  if (matchesPath(target.pathname, policy.excludedPathPatterns)) {
    return denied(target, kind, `excluded path: ${target.pathname}`);
  }

  return {
    allowed: true,
    checkedUrl: target.href,
    kind,
    evidence: 'topic policy allowed',
  };
}

function denied(
  url: URL,
  kind: TopicPolicyCheckKind,
  evidence: string,
): TopicPolicyDecision {
  return {
    allowed: false,
    checkedUrl: url.href,
    kind,
    evidence,
  };
}

function parseHttpUrl(value: string): URL {
  const url = new URL(value);
  if (url.protocol !== 'http:' && url.protocol !== 'https:') {
    throw new Error('topic policy URL must use http or https');
  }
  return url;
}

function normalizeHost(hostname: string): string {
  return hostname.toLowerCase().replace(/\.$/, '');
}

function matchesHost(host: string, patterns: string[]): boolean {
  return patterns.some((pattern) => {
    const normalizedPattern = normalizeHost(pattern);
    if (normalizedPattern.startsWith('*.')) {
      const suffix = normalizedPattern.slice(1);
      return host.endsWith(suffix) && host.length > suffix.length;
    }
    return host === normalizedPattern;
  });
}

function matchesPath(pathname: string, patterns: string[]): boolean {
  return patterns.some((pattern) => globToRegExp(pattern).test(pathname));
}

function globToRegExp(pattern: string): RegExp {
  const escaped = pattern
    .split('*')
    .map((part) => part.replace(/[.^$]/g, '\\$&'))
    .join('.*');
  return new RegExp(`^${escaped}$`);
}
