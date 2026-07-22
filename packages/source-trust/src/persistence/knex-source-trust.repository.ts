import { randomUUID } from 'node:crypto';
import { Injectable } from '@nestjs/common';
import { DbService } from '@seo-kb/db';
import {
  EntityScoreForStorage,
  EvidenceLinkForStorage,
  FactScoreForStorage,
  SourceProfileForStorage,
  SourceTrustRepository,
  SourceTrustScoreForStorage,
} from '../domain/source-trust-types';

@Injectable()
export class KnexSourceTrustRepository implements SourceTrustRepository {
  constructor(private readonly db: DbService) {}

  async saveSourceProfile(profile: SourceProfileForStorage): Promise<string> {
    const id = profile.id ?? randomUUID();
    await this.db.knex('source_profiles')
      .insert({
        id,
        source_url: profile.sourceUrl,
        canonical_url: profile.canonicalUrl,
        source_domain: profile.sourceDomain,
        source_type: profile.sourceType,
        review_status: profile.reviewStatus,
        rule_version: profile.ruleVersion,
        score_components: profile.components,
        source_trust_score: profile.score,
        created_at: this.db.knex.fn.now(),
        updated_at: this.db.knex.fn.now(),
      })
      .onConflict('id')
      .merge({
        source_type: profile.sourceType,
        review_status: profile.reviewStatus,
        rule_version: profile.ruleVersion,
        score_components: profile.components,
        source_trust_score: profile.score,
        updated_at: this.db.knex.fn.now(),
      });
    return id;
  }

  async saveSourceTrustScore(
    score: SourceTrustScoreForStorage,
  ): Promise<string> {
    const id = score.id ?? randomUUID();
    await this.db.knex('source_trust_scores').insert({
      id,
      source_profile_id: score.sourceProfileId ?? null,
      source_url: score.sourceUrl,
      canonical_url: score.canonicalUrl,
      source_domain: score.sourceDomain,
      source_type: score.sourceType,
      rule_version: score.ruleVersion,
      input_signals: score.inputSignals,
      score_components: score.components,
      source_trust_score: score.score,
      created_at: this.db.knex.fn.now(),
    });
    return id;
  }

  async saveEvidenceLink(link: EvidenceLinkForStorage): Promise<string> {
    const id = link.id ?? randomUUID();
    await this.db.knex('evidence_links')
      .insert({
        id,
        canonical_fact_id: link.canonicalFactId ?? null,
        entity_id: link.entityId ?? null,
        chunk_id: link.chunkId,
        document_id: link.documentId,
        document_version_id: link.documentVersionId,
        source_profile_id: link.sourceProfileId ?? null,
        evidence_role: link.evidenceRole,
        confidence: link.confidence ?? null,
        provenance: link.provenance,
        created_at: this.db.knex.fn.now(),
      })
      .onConflict('id')
      .merge({
        canonical_fact_id: link.canonicalFactId ?? null,
        entity_id: link.entityId ?? null,
        evidence_role: link.evidenceRole,
        confidence: link.confidence ?? null,
        provenance: link.provenance,
      });
    return id;
  }

  async saveFactScore(score: FactScoreForStorage): Promise<string> {
    const id = score.id ?? randomUUID();
    await this.db.knex('fact_scores')
      .insert({
        id,
        canonical_fact_id: score.factId,
        evidence_strength: score.evidenceStrengthScore,
        source_trust_score: score.sourceTrustScore,
        extraction_confidence: score.extractionConfidence,
        normalization_confidence: score.normalizationConfidence,
        final_confidence: score.finalConfidence,
        score_components: score.components,
        uncertainty_flags: score.uncertaintyFlags,
        rule_version: score.ruleVersion,
        created_at: this.db.knex.fn.now(),
        updated_at: this.db.knex.fn.now(),
      })
      .onConflict('canonical_fact_id')
      .merge({
        evidence_strength: score.evidenceStrengthScore,
        source_trust_score: score.sourceTrustScore,
        extraction_confidence: score.extractionConfidence,
        normalization_confidence: score.normalizationConfidence,
        final_confidence: score.finalConfidence,
        score_components: score.components,
        uncertainty_flags: score.uncertaintyFlags,
        rule_version: score.ruleVersion,
        updated_at: this.db.knex.fn.now(),
      });
    return id;
  }

  async saveEntityScore(score: EntityScoreForStorage): Promise<string> {
    const id = score.id ?? randomUUID();
    await this.db.knex('entity_scores')
      .insert({
        id,
        entity_id: score.entityId,
        alias_confidence: score.aliasConfidence,
        mention_count: score.mentionCount,
        source_diversity_score: score.sourceDiversityScore,
        average_source_trust: score.averageSourceTrust,
        final_confidence: score.finalConfidence,
        score_components: score.components,
        rule_version: score.ruleVersion,
        created_at: this.db.knex.fn.now(),
        updated_at: this.db.knex.fn.now(),
      })
      .onConflict('entity_id')
      .merge({
        alias_confidence: score.aliasConfidence,
        mention_count: score.mentionCount,
        source_diversity_score: score.sourceDiversityScore,
        average_source_trust: score.averageSourceTrust,
        final_confidence: score.finalConfidence,
        score_components: score.components,
        rule_version: score.ruleVersion,
        updated_at: this.db.knex.fn.now(),
      });
    return id;
  }
}
