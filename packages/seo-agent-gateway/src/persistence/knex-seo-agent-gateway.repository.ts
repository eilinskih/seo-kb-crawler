import { randomUUID } from 'node:crypto';
import { Injectable } from '@nestjs/common';
import { DbService } from '@seo-kb/db';
import {
  SaveSeoAgentGenerationContextCommand,
  SaveSeoAgentGenerationResponseCommand,
  SeoAgentGatewayRepository,
  SeoAgentGenerationContextRecord,
  SeoAgentGenerationResponseRecord,
} from './seo-agent-gateway.repository';
import {
  SeoAgentGenerationContext,
  SeoAgentGenerationRuntimeResult,
  SeoAgentGatewayRequest,
  SeoAgentPrompt,
  SeoAgentProviderResult,
} from '../domain/seo-agent-gateway-types';

interface SeoAgentGenerationContextRow {
  id: string;
  gateway_request_key: string;
  topic_id: string;
  query: string;
  objective: SeoAgentGatewayRequest['objective'];
  page_type: string | null;
  language: string | null;
  geo: SeoAgentGatewayRequest['geo'] | null;
  source_pack_references: SeoAgentGenerationContext['requiredPackReferences'];
  context: SeoAgentGenerationContext;
  fallback_state: SeoAgentGenerationContext['fallbackState'];
  degraded: boolean;
  warnings: string[];
  rule_version: string;
  created_at: Date | string;
}

interface SeoAgentGenerationResponseRow {
  id: string;
  gateway_request_key: string;
  topic_id: string;
  query: string;
  objective: SeoAgentGatewayRequest['objective'];
  provider_key: string | null;
  model_family: string | null;
  status: SeoAgentGenerationRuntimeResult['status'];
  degraded: boolean;
  prompt: SeoAgentPrompt;
  provider_result: SeoAgentProviderResult | null;
  final_content: string | null;
  warnings: string[];
  runtime_result: SeoAgentGenerationRuntimeResult;
  created_at: Date | string;
}

@Injectable()
export class KnexSeoAgentGatewayRepository
  implements SeoAgentGatewayRepository
{
  constructor(private readonly db: DbService) {}

  async saveGenerationContext(
    command: SaveSeoAgentGenerationContextCommand,
  ): Promise<SeoAgentGenerationContextRecord> {
    const row = toContextRow(command);
    await this.db.knex<SeoAgentGenerationContextRow>(
      'seo_agent_generation_contexts',
    ).insert(row);

    return toContextRecord(row);
  }

  async findLatestGenerationContext(
    topicId: string,
    query: string,
  ): Promise<SeoAgentGenerationContextRecord | null> {
    const row = await this.db.knex<SeoAgentGenerationContextRow>(
      'seo_agent_generation_contexts',
    )
      .where({
        topic_id: topicId,
        query,
      })
      .orderBy('created_at', 'desc')
      .first();

    return row ? toContextRecord(row) : null;
  }

  async saveGenerationResponse(
    command: SaveSeoAgentGenerationResponseCommand,
  ): Promise<SeoAgentGenerationResponseRecord> {
    const row = toResponseRow(command);
    await this.db.knex<SeoAgentGenerationResponseRow>(
      'seo_agent_generation_responses',
    ).insert(row);

    return toResponseRecord(row);
  }

  async findLatestGenerationResponse(
    topicId: string,
    query: string,
  ): Promise<SeoAgentGenerationResponseRecord | null> {
    const row = await this.db.knex<SeoAgentGenerationResponseRow>(
      'seo_agent_generation_responses',
    )
      .where({
        topic_id: topicId,
        query,
      })
      .orderBy('created_at', 'desc')
      .first();

    return row ? toResponseRecord(row) : null;
  }
}

function toContextRow(
  command: SaveSeoAgentGenerationContextCommand,
): SeoAgentGenerationContextRow {
  return {
    id: randomUUID(),
    gateway_request_key: command.context.gatewayRequestKey,
    topic_id: command.context.topicId,
    query: command.context.query,
    objective: command.context.objective,
    page_type: command.context.pageType ?? null,
    language: command.context.language ?? null,
    geo: command.context.geo ?? null,
    source_pack_references: command.context.requiredPackReferences,
    context: command.context,
    fallback_state: command.context.fallbackState,
    degraded: command.context.degraded,
    warnings: command.context.warnings,
    rule_version: command.context.ruleVersion,
    created_at: command.createdAt,
  };
}

function toContextRecord(
  row: SeoAgentGenerationContextRow,
): SeoAgentGenerationContextRecord {
  return {
    ...row.context,
    id: row.id,
    createdAt: toIsoString(row.created_at),
  };
}

function toResponseRow(
  command: SaveSeoAgentGenerationResponseCommand,
): SeoAgentGenerationResponseRow {
  const context = command.result.gatewayResult.generationContext;

  return {
    id: randomUUID(),
    gateway_request_key: context.gatewayRequestKey,
    topic_id: context.topicId,
    query: context.query,
    objective: context.objective,
    provider_key: command.result.providerResult?.providerKey ?? null,
    model_family: command.result.providerResult?.modelFamily ?? null,
    status: command.result.status,
    degraded: command.result.degraded,
    prompt: command.result.prompt,
    provider_result: command.result.providerResult,
    final_content: command.result.finalContent,
    warnings: command.result.warnings,
    runtime_result: command.result,
    created_at: command.createdAt,
  };
}

function toResponseRecord(
  row: SeoAgentGenerationResponseRow,
): SeoAgentGenerationResponseRecord {
  return {
    id: row.id,
    gatewayRequestKey: row.gateway_request_key,
    topicId: row.topic_id,
    query: row.query,
    objective: row.objective,
    providerKey: row.provider_key,
    modelFamily: row.model_family,
    status: row.status,
    degraded: row.degraded,
    finalContent: row.final_content,
    prompt: row.prompt,
    providerResult: row.provider_result,
    warnings: row.warnings,
    runtimeResult: row.runtime_result,
    createdAt: toIsoString(row.created_at),
  };
}

function toIsoString(value: Date | string): string {
  return value instanceof Date ? value.toISOString() : new Date(value).toISOString();
}

export const __testing = {
  toContextRow,
  toResponseRow,
};
