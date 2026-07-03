import { Injectable } from '@nestjs/common';
import { createHash } from 'node:crypto';
import { TopicSnapshot } from '@seo-kb/topic-engine';
import {
  DiscoveryRunConfiguration,
  DiscoveryRunPlan,
  DiscoverySourceType,
  SearchDiscoveryRunConfiguration,
  SitemapDiscoveryRunConfiguration,
  SeedDiscoveryRunConfiguration,
} from './discovery-types';

const defaultSearchProviderKey = 'default-search';

@Injectable()
export class DiscoveryPlanner {
  plan(
    snapshot: TopicSnapshot,
    options: DiscoveryPlanningOptions = {},
  ): DiscoveryRunPlan[] {
    const plans: DiscoveryRunPlan[] = [];
    const searchProviderKey =
      options.searchProviderKey ?? defaultSearchProviderKey;

    if (snapshot.discovery.search.enabled) {
      for (const query of snapshot.discovery.search.queries) {
        const configuration: SearchDiscoveryRunConfiguration = {
          sourceType: 'search',
          query: query.text,
          language: query.language,
          geo: query.geo,
          maxResults: snapshot.discovery.search.maxResultsPerQuery,
        };
        plans.push(
          planForConfiguration(snapshot, configuration, searchProviderKey, 1),
        );
      }
    }

    if (snapshot.discovery.sitemaps.enabled) {
      for (const sitemapUrl of snapshot.discovery.sitemaps.urls) {
        const configuration: SitemapDiscoveryRunConfiguration = {
          sourceType: 'sitemap',
          sitemapUrl,
        };
        plans.push(planForConfiguration(snapshot, configuration, 'sitemap', 1));
      }
    }

    if (snapshot.discovery.seeds.enabled) {
      const configuration: SeedDiscoveryRunConfiguration = {
        sourceType: 'seed',
        urls: [...snapshot.discovery.seeds.urls],
      };
      plans.push(planForConfiguration(snapshot, configuration, 'seed', 1));
    }

    return plans;
  }
}

export interface DiscoveryPlanningOptions {
  searchProviderKey?: string;
}

function planForConfiguration(
  snapshot: TopicSnapshot,
  configuration: DiscoveryRunConfiguration,
  providerKey: string | null,
  runSequence: number,
): DiscoveryRunPlan {
  const sourceKey = sourceKeyFor(configuration, providerKey);

  return {
    topicId: snapshot.topicId,
    topicConfigurationVersion: snapshot.configurationVersion,
    sourceType: configuration.sourceType,
    sourceKey,
    providerKey,
    runSequence,
    planningKey: planningKey({
      topicId: snapshot.topicId,
      topicConfigurationVersion: snapshot.configurationVersion,
      sourceType: configuration.sourceType,
      sourceKey,
      runSequence,
    }),
    configuration,
  };
}

function sourceKeyFor(
  configuration: DiscoveryRunConfiguration,
  providerKey: string | null,
): string {
  switch (configuration.sourceType) {
    case 'search':
      return stableKey(configuration.sourceType, providerKey, {
        query: configuration.query,
        language: configuration.language,
        geo: configuration.geo,
        maxResults: configuration.maxResults,
      });
    case 'sitemap':
      return stableKey(configuration.sourceType, providerKey, {
        sitemapUrl: configuration.sitemapUrl,
      });
    case 'seed':
      return stableKey(configuration.sourceType, providerKey, {
        urls: configuration.urls,
      });
    case 'link':
      return stableKey(configuration.sourceType, providerKey, {
        crawlAttemptId: configuration.crawlAttemptId,
        referringUrl: configuration.referringUrl,
      });
    case 'operator':
      return stableKey(configuration.sourceType, providerKey, {
        urls: configuration.urls,
        reason: configuration.reason,
      });
  }
}

function planningKey(input: {
  topicId: string;
  topicConfigurationVersion: number;
  sourceType: DiscoverySourceType;
  sourceKey: string;
  runSequence: number;
}): string {
  return stableKey('planning', null, input);
}

function stableKey(
  sourceType: string,
  providerKey: string | null,
  payload: unknown,
): string {
  return createHash('sha256')
    .update(sourceType)
    .update('\0')
    .update(providerKey ?? '')
    .update('\0')
    .update(stableJson(payload))
    .digest('hex');
}

function stableJson(value: unknown): string {
  return JSON.stringify(sortJson(value));
}

function sortJson(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(sortJson);
  }
  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value)
        .filter(([, entryValue]) => entryValue !== undefined)
        .sort(([left], [right]) => left.localeCompare(right))
        .map(([key, entryValue]) => [key, sortJson(entryValue)]),
    );
  }
  return value;
}
