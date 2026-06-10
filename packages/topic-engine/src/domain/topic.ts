import { createHash, randomUUID } from 'node:crypto';
import {
  TopicConflictError,
  TopicStateError,
  TopicValidationError,
} from './topic-errors';
import {
  CrawlPolicy,
  CreateTopicInput,
  DiscoveryConfiguration,
  IntentProfile,
  LanguageGeoModel,
  RelevanceProfile,
  ReplaceTopicConfigurationInput,
  TopicConfiguration,
  TopicRecord,
  TopicSnapshot,
  TopicStatus,
} from './topic-types';

const slugPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const languageTagPattern = /^[a-z]{2,3}(?:-[A-Z]{2}|-[A-Za-z0-9]{4,8})*$/;
const countryCodePattern = /^[A-Z]{2}$/;
const regionCodePattern = /^[A-Z]{2}-[A-Z0-9]{1,3}$/;
const hostnamePattern =
  /^(?:\*\.)?(?=.{1,253}$)(?!-)(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)*[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/;

export class Topic {
  private constructor(private record: TopicRecord) {}

  static create(input: CreateTopicInput, now = new Date()): Topic {
    const configuration = normalizeAndValidateConfiguration(input);
    const slug = normalizeSlug(input.slug);
    const name = normalizeBoundedText(input.name, 'name', 3, 160);
    const description = normalizeOptionalText(input.description, 'description', 2000);
    const fingerprints = configurationFingerprints(configuration);

    return new Topic({
      id: randomUUID(),
      slug,
      name,
      description,
      status: 'draft',
      configurationVersion: 1,
      ...configuration,
      ...fingerprints,
      createdAt: now,
      updatedAt: now,
      activatedAt: null,
      archivedAt: null,
    });
  }

  static rehydrate(record: TopicRecord): Topic {
    return new Topic({
      ...record,
      createdAt: new Date(record.createdAt),
      updatedAt: new Date(record.updatedAt),
      activatedAt: record.activatedAt ? new Date(record.activatedAt) : null,
      archivedAt: record.archivedAt ? new Date(record.archivedAt) : null,
    });
  }

  toRecord(): TopicRecord {
    return structuredClone(this.record);
  }

  toSnapshot(now = new Date()): TopicSnapshot {
    return {
      topicId: this.record.id,
      configurationVersion: this.record.configurationVersion,
      discovery: structuredClone(this.record.discovery),
      languageGeo: structuredClone(this.record.languageGeo),
      crawlPolicy: structuredClone(this.record.crawlPolicy),
      relevanceProfile: structuredClone(this.record.relevanceProfile),
      intentProfile: structuredClone(this.record.intentProfile),
      crawlPolicyFingerprint: this.record.crawlPolicyFingerprint,
      relevanceProfileFingerprint: this.record.relevanceProfileFingerprint,
      createdAt: now,
    };
  }

  replaceConfiguration(
    input: ReplaceTopicConfigurationInput,
    now = new Date(),
  ): TopicSnapshot {
    this.assertMutable();

    if (input.expectedConfigurationVersion !== this.record.configurationVersion) {
      throw new TopicConflictError(
        `Expected configuration version ${input.expectedConfigurationVersion}, current version is ${this.record.configurationVersion}`,
      );
    }

    const configuration = normalizeAndValidateConfiguration(input);
    const fingerprints = configurationFingerprints(configuration);

    this.record = {
      ...this.record,
      ...configuration,
      ...fingerprints,
      name:
        input.name === undefined
          ? this.record.name
          : normalizeBoundedText(input.name, 'name', 3, 160),
      description:
        input.description === undefined
          ? this.record.description
          : normalizeOptionalText(input.description, 'description', 2000),
      configurationVersion: this.record.configurationVersion + 1,
      updatedAt: now,
    };

    return this.toSnapshot(now);
  }

  activate(now = new Date()): void {
    this.assertStatus(['draft', 'paused'], 'activate');
    validateActivation(this.record);
    this.record.status = 'active';
    this.record.activatedAt ??= now;
    this.record.updatedAt = now;
  }

  pause(now = new Date()): void {
    this.assertStatus(['active'], 'pause');
    this.record.status = 'paused';
    this.record.updatedAt = now;
  }

  resume(now = new Date()): void {
    this.assertStatus(['paused'], 'resume');
    validateActivation(this.record);
    this.record.status = 'active';
    this.record.updatedAt = now;
  }

  archive(now = new Date()): void {
    this.assertStatus(['draft', 'active', 'paused'], 'archive');
    this.record.status = 'archived';
    this.record.archivedAt = now;
    this.record.updatedAt = now;
  }

  private assertMutable(): void {
    if (this.record.status === 'archived') {
      throw new TopicStateError('Archived topics are read-only');
    }
  }

  private assertStatus(allowed: TopicStatus[], operation: string): void {
    if (!allowed.includes(this.record.status)) {
      throw new TopicStateError(
        `Cannot ${operation} topic while status is ${this.record.status}`,
      );
    }
  }
}

function normalizeAndValidateConfiguration(
  input: TopicConfiguration,
): TopicConfiguration {
  return {
    discovery: normalizeDiscovery(input.discovery),
    languageGeo: normalizeLanguageGeo(input.languageGeo),
    crawlPolicy: normalizeCrawlPolicy(input.crawlPolicy),
    relevanceProfile: normalizeRelevanceProfile(input.relevanceProfile),
    intentProfile: normalizeIntentProfile(input.intentProfile),
  };
}

function normalizeDiscovery(input: DiscoveryConfiguration): DiscoveryConfiguration {
  if (
    !input ||
    input.schemaVersion !== 1 ||
    !input.search ||
    !input.sitemaps ||
    !input.seeds ||
    !Array.isArray(input.search.queries)
  ) {
    throw new TopicValidationError('discovery.schemaVersion must be 1');
  }

  const queries = uniqueBy(
    input.search.queries.map((query) => ({
      text: normalizeBoundedText(query.text, 'search query', 2, 300),
      language: query.language?.trim(),
      geo: query.geo
        ? {
            countryCode: normalizeCountryCode(query.geo.countryCode),
            regionCode: query.geo.regionCode
              ? normalizeRegionCode(query.geo.regionCode, query.geo.countryCode)
              : undefined,
          }
        : undefined,
    })),
    (query) => JSON.stringify(query),
  );
  assertCollectionSize(queries, 'search queries', input.search.enabled ? 1 : 0, 100);
  assertIntegerRange(input.search.maxResultsPerQuery, 'maxResultsPerQuery', 1, 100);

  const sitemapUrls = normalizeUrls(input.sitemaps.urls, 'sitemap URLs', 100);
  const seedUrls = normalizeUrls(input.seeds.urls, 'seed URLs', 500);

  if (input.sitemaps.enabled && sitemapUrls.length === 0) {
    throw new TopicValidationError('Enabled sitemap discovery requires a URL');
  }
  if (input.seeds.enabled && seedUrls.length === 0) {
    throw new TopicValidationError('Enabled seed discovery requires a URL');
  }

  return {
    schemaVersion: 1,
    search: {
      enabled: Boolean(input.search.enabled),
      queries,
      maxResultsPerQuery: input.search.maxResultsPerQuery,
    },
    sitemaps: { enabled: Boolean(input.sitemaps.enabled), urls: sitemapUrls },
    seeds: { enabled: Boolean(input.seeds.enabled), urls: seedUrls },
  };
}

function normalizeLanguageGeo(input: LanguageGeoModel): LanguageGeoModel {
  if (
    !input ||
    !Array.isArray(input.languages) ||
    !Array.isArray(input.geoTargets)
  ) {
    throw new TopicValidationError('languageGeo.languages is required');
  }

  const languages = uniqueBy(
    input.languages.map((language) => {
      const tag = language.tag.trim();
      if (!languageTagPattern.test(tag)) {
        throw new TopicValidationError(`Invalid BCP 47 language tag: ${tag}`);
      }
      if (!['primary', 'secondary'].includes(language.role)) {
        throw new TopicValidationError(`Invalid language role: ${language.role}`);
      }
      assertRange(language.minimumConfidence, 'minimumConfidence', 0, 1);
      return { ...language, tag };
    }),
    (language) => language.tag.toLowerCase(),
  );
  assertCollectionSize(languages, 'languages', 1, 50);

  if (languages.filter((language) => language.role === 'primary').length !== 1) {
    throw new TopicValidationError('Exactly one primary language is required');
  }

  const geoTargets = uniqueBy(
    input.geoTargets.map((target) => {
      const countryCode = normalizeCountryCode(target.countryCode);
      assertIntegerRange(target.priority, 'geo priority', 0, 100);
      return {
        countryCode,
        regionCode: target.regionCode
          ? normalizeRegionCode(target.regionCode, countryCode)
          : undefined,
        priority: target.priority,
      };
    }),
    (target) => `${target.countryCode}:${target.regionCode ?? ''}`,
  );

  if (!['global', 'targeted'].includes(input.geoMode)) {
    throw new TopicValidationError(`Invalid geo mode: ${input.geoMode}`);
  }
  if (input.geoMode === 'global' && geoTargets.length > 0) {
    throw new TopicValidationError('Global geo mode cannot contain geo targets');
  }
  if (input.geoMode === 'targeted' && geoTargets.length === 0) {
    throw new TopicValidationError('Targeted geo mode requires geo targets');
  }

  return { languages, geoTargets, geoMode: input.geoMode };
}

function normalizeCrawlPolicy(input: CrawlPolicy): CrawlPolicy {
  if (
    !input ||
    !Array.isArray(input.allowedHosts) ||
    !Array.isArray(input.deniedHosts) ||
    !Array.isArray(input.includedPathPatterns) ||
    !Array.isArray(input.excludedPathPatterns) ||
    !Array.isArray(input.ignoredQueryParameters) ||
    !Array.isArray(input.allowedContentTypes)
  ) {
    throw new TopicValidationError('crawlPolicy is incomplete');
  }

  const allowedHosts = normalizeHosts(input.allowedHosts, 'allowedHosts', 1, 500);
  const deniedHosts = normalizeHosts(input.deniedHosts, 'deniedHosts', 0, 500);
  const ignoredQueryParameters = uniqueStrings(
    input.ignoredQueryParameters,
    'ignoredQueryParameters',
    0,
    100,
  );

  assertIntegerRange(input.maxDepth, 'maxDepth', 0, 10);
  assertIntegerRange(input.maxPages, 'maxPages', 1, 1_000_000);
  assertIntegerRange(
    input.maxRequestsPerMinutePerHost,
    'maxRequestsPerMinutePerHost',
    1,
    120,
  );
  assertIntegerRange(
    input.maxConcurrentRequestsPerHost,
    'maxConcurrentRequestsPerHost',
    1,
    8,
  );
  assertIntegerRange(input.requestTimeoutMs, 'requestTimeoutMs', 1_000, 120_000);
  assertIntegerRange(
    input.maxResponseBytes,
    'maxResponseBytes',
    1_048_576,
    52_428_800,
  );
  assertIntegerRange(
    input.minRecrawlIntervalHours,
    'minRecrawlIntervalHours',
    1,
    8_760,
  );
  assertIntegerRange(
    input.recrawlIntervalHours,
    'recrawlIntervalHours',
    input.minRecrawlIntervalHours,
    8_760,
  );
  assertIntegerRange(
    input.maxRecrawlIntervalHours,
    'maxRecrawlIntervalHours',
    input.recrawlIntervalHours,
    8_760,
  );

  if (input.robotsPolicy !== 'strict') {
    throw new TopicValidationError('robotsPolicy must be strict');
  }
  if (!['never', 'auto', 'always'].includes(input.renderMode)) {
    throw new TopicValidationError(`Invalid renderMode: ${input.renderMode}`);
  }
  if (
    !['same-host', 'allowed-hosts'].includes(input.crossHostCanonicalPolicy)
  ) {
    throw new TopicValidationError(
      `Invalid crossHostCanonicalPolicy: ${input.crossHostCanonicalPolicy}`,
    );
  }

  return {
    ...input,
    allowedHosts,
    deniedHosts,
    includedPathPatterns: normalizeGlobs(
      input.includedPathPatterns,
      'includedPathPatterns',
    ),
    excludedPathPatterns: normalizeGlobs(
      input.excludedPathPatterns,
      'excludedPathPatterns',
    ),
    ignoredQueryParameters,
    allowedContentTypes: uniqueStrings(
      input.allowedContentTypes,
      'allowedContentTypes',
      1,
      20,
    ),
  };
}

function normalizeRelevanceProfile(input: RelevanceProfile): RelevanceProfile {
  if (
    !input ||
    !Array.isArray(input.requiredTermGroups) ||
    !Array.isArray(input.excludedTerms) ||
    !Array.isArray(input.weightedTerms) ||
    !Array.isArray(input.hostAdjustments) ||
    !input.fieldWeights
  ) {
    throw new TopicValidationError('relevanceProfile is incomplete');
  }

  assertRange(input.minimumScore, 'minimumScore', 0, 1);

  const requiredTermGroups = input.requiredTermGroups.map((group) =>
    uniqueStrings(group, 'required term group', 1, 50).map(normalizeTerm),
  );
  assertCollectionSize(requiredTermGroups, 'requiredTermGroups', 0, 20);
  const excludedTerms = uniqueStrings(
    input.excludedTerms.map(normalizeTerm),
    'excludedTerms',
    0,
    500,
  );
  const weightedTerms = uniqueBy(
    input.weightedTerms.map((item) => {
      assertRange(item.weight, 'term weight', -1, 1);
      return { term: normalizeTerm(item.term), weight: item.weight };
    }),
    (item) => item.term,
  );
  assertCollectionSize(weightedTerms, 'weightedTerms', 0, 500);

  const requiredTerms = new Set(requiredTermGroups.flat());
  for (const term of excludedTerms) {
    if (requiredTerms.has(term)) {
      throw new TopicValidationError(
        `Term "${term}" cannot be both required and excluded`,
      );
    }
  }

  const fieldWeights = input.fieldWeights;
  const weightTotal = Object.values(fieldWeights).reduce(
    (total, value) => total + value,
    0,
  );
  Object.values(fieldWeights).forEach((value) =>
    assertRange(value, 'field weight', 0, 1),
  );
  if (Math.abs(weightTotal - 1) > 0.000001) {
    throw new TopicValidationError('Relevance field weights must sum to 1');
  }

  const hostAdjustments = uniqueBy(
    input.hostAdjustments.map((item) => {
      assertRange(item.adjustment, 'host adjustment', -0.5, 0.5);
      return { host: normalizeHost(item.host), adjustment: item.adjustment };
    }),
    (item) => item.host,
  );

  return {
    minimumScore: input.minimumScore,
    allowExploratoryCrawl: Boolean(input.allowExploratoryCrawl),
    requiredTermGroups,
    excludedTerms,
    weightedTerms,
    fieldWeights,
    hostAdjustments,
  };
}

function normalizeIntentProfile(input: IntentProfile | null): IntentProfile | null {
  if (input === null || input === undefined) {
    return null;
  }

  const normalized: IntentProfile = {};
  for (const key of [
    'informational',
    'commercial',
    'navigational',
    'transactional',
  ] as const) {
    const value = input[key] ?? 0;
    assertRange(value, `intent.${key}`, 0, 1);
    if (value > 0) {
      normalized[key] = value;
    }
  }

  const total = Object.values(normalized).reduce(
    (sum, value) => sum + (value ?? 0),
    0,
  );
  if (Math.abs(total - 1) > 0.000001) {
    throw new TopicValidationError('Intent profile weights must sum to 1');
  }

  return normalized;
}

function validateActivation(configuration: TopicConfiguration): void {
  const discovery = configuration.discovery;
  if (!discovery.search.enabled && !discovery.sitemaps.enabled && !discovery.seeds.enabled) {
    throw new TopicStateError(
      'At least one discovery channel must be enabled before activation',
    );
  }

  const languageTags = new Set(
    configuration.languageGeo.languages.map((language) =>
      language.tag.toLowerCase(),
    ),
  );
  for (const query of discovery.search.queries) {
    if (query.language && !languageTags.has(query.language.toLowerCase())) {
      throw new TopicStateError(
        `Search query language ${query.language} is not a Topic language`,
      );
    }
  }
}

function configurationFingerprints(configuration: TopicConfiguration): {
  crawlPolicyFingerprint: string;
  relevanceProfileFingerprint: string;
} {
  return {
    crawlPolicyFingerprint: fingerprint(configuration.crawlPolicy),
    relevanceProfileFingerprint: fingerprint(configuration.relevanceProfile),
  };
}

function fingerprint(value: unknown): string {
  return createHash('sha256').update(stableStringify(value)).digest('hex');
}

function stableStringify(value: unknown): string {
  if (Array.isArray(value)) {
    return `[${value.map(stableStringify).join(',')}]`;
  }
  if (value && typeof value === 'object') {
    return `{${Object.entries(value)
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([key, item]) => `${JSON.stringify(key)}:${stableStringify(item)}`)
      .join(',')}}`;
  }
  return JSON.stringify(value);
}

function normalizeSlug(value: string): string {
  const slug = normalizeBoundedText(value, 'slug', 3, 80).toLowerCase();
  if (!slugPattern.test(slug)) {
    throw new TopicValidationError('slug must use lowercase kebab-case');
  }
  return slug;
}

function normalizeBoundedText(
  value: string,
  field: string,
  min: number,
  max: number,
): string {
  if (typeof value !== 'string') {
    throw new TopicValidationError(`${field} must be a string`);
  }
  const normalized = value.trim();
  if (normalized.length < min || normalized.length > max) {
    throw new TopicValidationError(
      `${field} must contain between ${min} and ${max} characters`,
    );
  }
  return normalized;
}

function normalizeOptionalText(
  value: string | null | undefined,
  field: string,
  max: number,
): string | null {
  if (value === null || value === undefined || value.trim() === '') {
    return null;
  }
  return normalizeBoundedText(value, field, 1, max);
}

function normalizeUrls(values: string[], field: string, max: number): string[] {
  if (!Array.isArray(values)) {
    throw new TopicValidationError(`${field} must be an array`);
  }
  const normalized = uniqueBy(
    values.map((value) => {
      let url: URL;
      try {
        url = new URL(value);
      } catch {
        throw new TopicValidationError(`Invalid URL in ${field}: ${value}`);
      }
      if (!['http:', 'https:'].includes(url.protocol)) {
        throw new TopicValidationError(`${field} only supports HTTP(S) URLs`);
      }
      url.hash = '';
      return url.toString();
    }),
    (value) => value,
  );
  assertCollectionSize(normalized, field, 0, max);
  return normalized;
}

function normalizeHosts(
  values: string[],
  field: string,
  min: number,
  max: number,
): string[] {
  const normalized = values.map(normalizeHost);
  return uniqueStrings(normalized, field, min, max);
}

function normalizeHost(value: string): string {
  const host = value.trim().toLowerCase().replace(/\.$/, '');
  if (
    !hostnamePattern.test(host) ||
    host === 'localhost' ||
    /^\d{1,3}(?:\.\d{1,3}){3}$/.test(host)
  ) {
    throw new TopicValidationError(`Invalid or unsafe host pattern: ${value}`);
  }
  return host;
}

function normalizeGlobs(values: string[], field: string): string[] {
  const globs = uniqueStrings(values, field, 0, 200);
  for (const glob of globs) {
    if (!glob.startsWith('/') || /[()[\]{}+?|\\]/.test(glob)) {
      throw new TopicValidationError(`Invalid bounded path glob: ${glob}`);
    }
  }
  return globs;
}

function normalizeCountryCode(value: string): string {
  const code = value.trim().toUpperCase();
  if (!countryCodePattern.test(code)) {
    throw new TopicValidationError(`Invalid country code: ${value}`);
  }
  return code;
}

function normalizeRegionCode(value: string, countryCode: string): string {
  const code = value.trim().toUpperCase();
  if (!regionCodePattern.test(code) || !code.startsWith(`${countryCode.toUpperCase()}-`)) {
    throw new TopicValidationError(`Invalid region code: ${value}`);
  }
  return code;
}

function normalizeTerm(value: string): string {
  return normalizeBoundedText(value.normalize('NFKC').toLowerCase(), 'term', 1, 200);
}

function uniqueStrings(
  values: string[],
  field: string,
  min: number,
  max: number,
): string[] {
  if (!Array.isArray(values)) {
    throw new TopicValidationError(`${field} must be an array`);
  }
  const normalized = uniqueBy(
    values.map((value) => normalizeBoundedText(value, field, 1, 300)),
    (value) => value.toLowerCase(),
  );
  assertCollectionSize(normalized, field, min, max);
  return normalized;
}

function uniqueBy<T>(values: T[], key: (value: T) => string): T[] {
  const seen = new Set<string>();
  return values.filter((value) => {
    const itemKey = key(value);
    if (seen.has(itemKey)) {
      return false;
    }
    seen.add(itemKey);
    return true;
  });
}

function assertCollectionSize(
  values: unknown[],
  field: string,
  min: number,
  max: number,
): void {
  if (values.length < min || values.length > max) {
    throw new TopicValidationError(
      `${field} must contain between ${min} and ${max} items`,
    );
  }
}

function assertRange(
  value: number,
  field: string,
  min: number,
  max: number,
): void {
  if (typeof value !== 'number' || !Number.isFinite(value) || value < min || value > max) {
    throw new TopicValidationError(`${field} must be between ${min} and ${max}`);
  }
}

function assertIntegerRange(
  value: number,
  field: string,
  min: number,
  max: number,
): void {
  if (!Number.isInteger(value) || value < min || value > max) {
    throw new TopicValidationError(
      `${field} must be an integer between ${min} and ${max}`,
    );
  }
}
