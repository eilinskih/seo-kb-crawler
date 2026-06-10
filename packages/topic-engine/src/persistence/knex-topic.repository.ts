import { Injectable } from '@nestjs/common';
import { DbService } from '@seo-kb/db';
import { Knex } from 'knex';
import { Topic } from '../domain/topic';
import { TopicConflictError } from '../domain/topic-errors';
import {
  CrawlPolicy,
  DiscoveryConfiguration,
  IntentProfile,
  LanguageGeoModel,
  RelevanceProfile,
  TopicRecord,
  TopicSnapshot,
  TopicStatus,
} from '../domain/topic-types';
import { TopicRepository } from './topic.repository';

interface TopicRow {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  status: TopicStatus;
  configuration_version: number;
  discovery: DiscoveryConfiguration;
  language_geo: LanguageGeoModel;
  crawl_policy: CrawlPolicy;
  relevance_profile: RelevanceProfile;
  intent_profile: IntentProfile | null;
  crawl_policy_fingerprint: string;
  relevance_profile_fingerprint: string;
  created_at: Date | string;
  updated_at: Date | string;
  activated_at: Date | string | null;
  archived_at: Date | string | null;
}

interface TopicSnapshotRow {
  topic_id: string;
  configuration_version: number;
  discovery: DiscoveryConfiguration;
  language_geo: LanguageGeoModel;
  crawl_policy: CrawlPolicy;
  relevance_profile: RelevanceProfile;
  intent_profile: IntentProfile | null;
  crawl_policy_fingerprint: string;
  relevance_profile_fingerprint: string;
  created_at: Date | string;
}

@Injectable()
export class KnexTopicRepository implements TopicRepository {
  constructor(private readonly db: DbService) {}

  async create(topic: Topic, snapshot: TopicSnapshot): Promise<void> {
    try {
      await this.db.knex.transaction(async (transaction) => {
        await transaction<TopicRow>('topics').insert(toTopicRow(topic.toRecord()));
        await transaction<TopicSnapshotRow>(
          'topic_configuration_snapshots',
        ).insert(toSnapshotRow(snapshot));
      });
    } catch (error) {
      if (isPostgresUniqueViolation(error)) {
        throw new TopicConflictError('Topic slug already exists');
      }
      throw error;
    }
  }

  async findById(id: string): Promise<Topic | null> {
    const row = await this.db.knex<TopicRow>('topics').where({ id }).first();
    return row ? Topic.rehydrate(toTopicRecord(row)) : null;
  }

  async list(): Promise<Topic[]> {
    const rows = await this.db.knex<TopicRow>('topics')
      .select('*')
      .orderBy('created_at', 'asc');
    return rows.map((row) => Topic.rehydrate(toTopicRecord(row)));
  }

  async updateLifecycle(
    topic: Topic,
    expectedStatus: TopicStatus,
  ): Promise<void> {
    const record = topic.toRecord();
    const updated = await this.db.knex<TopicRow>('topics')
      .where({ id: record.id, status: expectedStatus })
      .update(toLifecycleUpdate(record));
    if (updated !== 1) {
      throw new TopicConflictError('Topic was modified concurrently');
    }
  }

  async updateWithSnapshot(
    topic: Topic,
    snapshot: TopicSnapshot,
    expectedConfigurationVersion: number,
    expectedStatus: TopicStatus,
  ): Promise<void> {
    await this.db.knex.transaction(async (transaction) => {
      const record = topic.toRecord();
      const updated = await transaction<TopicRow>('topics')
        .where({
          id: record.id,
          configuration_version: expectedConfigurationVersion,
          status: expectedStatus,
        })
        .update(toConfigurationUpdate(record));

      if (updated !== 1) {
        throw new TopicConflictError('Topic was modified concurrently');
      }

      await transaction<TopicSnapshotRow>('topic_configuration_snapshots').insert(
        toSnapshotRow(snapshot),
      );
    });
  }

  async findSnapshot(
    topicId: string,
    configurationVersion: number,
  ): Promise<TopicSnapshot | null> {
    const row = await this.db.knex<TopicSnapshotRow>(
      'topic_configuration_snapshots',
    )
      .where({
        topic_id: topicId,
        configuration_version: configurationVersion,
      })
      .first();

    return row
      ? {
          topicId: row.topic_id,
          configurationVersion: row.configuration_version,
          discovery: row.discovery,
          languageGeo: row.language_geo,
          crawlPolicy: row.crawl_policy,
          relevanceProfile: row.relevance_profile,
          intentProfile: row.intent_profile,
          crawlPolicyFingerprint: row.crawl_policy_fingerprint,
          relevanceProfileFingerprint: row.relevance_profile_fingerprint,
          createdAt: new Date(row.created_at),
        }
      : null;
  }
}

function toTopicRow(record: TopicRecord): TopicRow {
  return {
    id: record.id,
    slug: record.slug,
    name: record.name,
    description: record.description,
    status: record.status,
    configuration_version: record.configurationVersion,
    discovery: record.discovery,
    language_geo: record.languageGeo,
    crawl_policy: record.crawlPolicy,
    relevance_profile: record.relevanceProfile,
    intent_profile: record.intentProfile,
    crawl_policy_fingerprint: record.crawlPolicyFingerprint,
    relevance_profile_fingerprint: record.relevanceProfileFingerprint,
    created_at: record.createdAt,
    updated_at: record.updatedAt,
    activated_at: record.activatedAt,
    archived_at: record.archivedAt,
  };
}

function toConfigurationUpdate(record: TopicRecord): Partial<TopicRow> {
  return {
    name: record.name,
    description: record.description,
    configuration_version: record.configurationVersion,
    discovery: record.discovery,
    language_geo: record.languageGeo,
    crawl_policy: record.crawlPolicy,
    relevance_profile: record.relevanceProfile,
    intent_profile: record.intentProfile,
    crawl_policy_fingerprint: record.crawlPolicyFingerprint,
    relevance_profile_fingerprint: record.relevanceProfileFingerprint,
    updated_at: record.updatedAt,
  };
}

function toLifecycleUpdate(record: TopicRecord): Partial<TopicRow> {
  return {
    status: record.status,
    updated_at: record.updatedAt,
    activated_at: record.activatedAt,
    archived_at: record.archivedAt,
  };
}

function toTopicRecord(row: TopicRow): TopicRecord {
  return {
    id: row.id,
    slug: row.slug,
    name: row.name,
    description: row.description,
    status: row.status,
    configurationVersion: row.configuration_version,
    discovery: row.discovery,
    languageGeo: row.language_geo,
    crawlPolicy: row.crawl_policy,
    relevanceProfile: row.relevance_profile,
    intentProfile: row.intent_profile,
    crawlPolicyFingerprint: row.crawl_policy_fingerprint,
    relevanceProfileFingerprint: row.relevance_profile_fingerprint,
    createdAt: new Date(row.created_at),
    updatedAt: new Date(row.updated_at),
    activatedAt: row.activated_at ? new Date(row.activated_at) : null,
    archivedAt: row.archived_at ? new Date(row.archived_at) : null,
  };
}

function toSnapshotRow(snapshot: TopicSnapshot): TopicSnapshotRow {
  return {
    topic_id: snapshot.topicId,
    configuration_version: snapshot.configurationVersion,
    discovery: snapshot.discovery,
    language_geo: snapshot.languageGeo,
    crawl_policy: snapshot.crawlPolicy,
    relevance_profile: snapshot.relevanceProfile,
    intent_profile: snapshot.intentProfile,
    crawl_policy_fingerprint: snapshot.crawlPolicyFingerprint,
    relevance_profile_fingerprint: snapshot.relevanceProfileFingerprint,
    created_at: snapshot.createdAt,
  };
}

function isPostgresUniqueViolation(error: unknown): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    error.code === '23505'
  );
}
