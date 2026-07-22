import { randomUUID } from 'node:crypto';
import { Injectable } from '@nestjs/common';
import { DbService } from '@seo-kb/db';
import {
  ConflictSetForStorage,
  ConsensusGroupForStorage,
  ContentGapHintForStorage,
  SeoConsensusRepository,
  SeoPhrasingHintForStorage,
} from '../domain/seo-consensus-types';

@Injectable()
export class KnexSeoConsensusRepository implements SeoConsensusRepository {
  constructor(private readonly db: DbService) {}

  async saveConsensusGroup(group: ConsensusGroupForStorage): Promise<string> {
    const id = group.id ?? randomUUID();
    await this.db.knex('consensus_groups')
      .insert({
        id,
        group_key: group.groupKey,
        subject_entity_id: group.subjectEntityId,
        predicate_id: group.predicateId,
        comparable_key: group.comparableKey,
        strongest_value: group.strongestAlternative?.value ?? null,
        support_counts: {
          factCount: group.factCount,
          supportingChunkCount: group.supportingChunkCount,
          supportingDomainCount: group.supportingDomainCount,
        },
        score_summary: {
          confidenceLevel: group.confidenceLevel,
          strongestSupportScore: group.strongestAlternative?.supportScore ?? null,
        },
        alternatives: group.alternatives,
        status: group.status,
        rule_version: group.ruleVersion,
        created_at: this.db.knex.fn.now(),
        updated_at: this.db.knex.fn.now(),
      })
      .onConflict('group_key')
      .merge({
        strongest_value: group.strongestAlternative?.value ?? null,
        support_counts: {
          factCount: group.factCount,
          supportingChunkCount: group.supportingChunkCount,
          supportingDomainCount: group.supportingDomainCount,
        },
        score_summary: {
          confidenceLevel: group.confidenceLevel,
          strongestSupportScore: group.strongestAlternative?.supportScore ?? null,
        },
        alternatives: group.alternatives,
        status: group.status,
        rule_version: group.ruleVersion,
        updated_at: this.db.knex.fn.now(),
      });
    return id;
  }

  async saveConflictSet(conflict: ConflictSetForStorage): Promise<string> {
    const id = conflict.id ?? randomUUID();
    await this.db.knex('conflict_sets')
      .insert({
        id,
        conflict_key: conflict.conflictKey,
        group_key: conflict.groupKey,
        subject_entity_id: conflict.subjectEntityId,
        predicate_id: conflict.predicateId,
        comparable_key: conflict.comparableKey,
        competing_values: conflict.alternatives,
        severity: conflict.severity,
        suggested_handling: conflict.suggestedHandling,
        status: conflict.status,
        rule_version: conflict.ruleVersion,
        created_at: this.db.knex.fn.now(),
        updated_at: this.db.knex.fn.now(),
      })
      .onConflict('conflict_key')
      .merge({
        competing_values: conflict.alternatives,
        severity: conflict.severity,
        suggested_handling: conflict.suggestedHandling,
        status: conflict.status,
        rule_version: conflict.ruleVersion,
        updated_at: this.db.knex.fn.now(),
      });
    return id;
  }

  async saveSeoPhrasingHint(hint: SeoPhrasingHintForStorage): Promise<string> {
    const id = hint.id ?? randomUUID();
    await this.db.knex('seo_phrasing_hints').insert({
      id,
      target_type: hint.targetType,
      target_key: hint.targetKey,
      hint_type: hint.hintType,
      hint_payload: {
        message: hint.message,
        payload: hint.payload,
      },
      rule_version: hint.ruleVersion,
      created_at: this.db.knex.fn.now(),
    });
    return id;
  }

  async saveContentGapHint(hint: ContentGapHintForStorage): Promise<string> {
    const id = hint.id ?? randomUUID();
    await this.db.knex('content_gap_hints').insert({
      id,
      target_key: hint.targetKey,
      gap_type: hint.gapType,
      reason: hint.reason,
      suggested_angle: hint.suggestedAngle,
      rule_version: hint.ruleVersion,
      created_at: this.db.knex.fn.now(),
    });
    return id;
  }
}
