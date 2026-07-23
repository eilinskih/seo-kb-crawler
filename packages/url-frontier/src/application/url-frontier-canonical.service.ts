import { randomUUID } from 'node:crypto';
import { Injectable } from '@nestjs/common';
import {
  UrlFrontierCanonicalRelationCommand,
  UrlFrontierCanonicalRelationResult,
} from '../domain/url-frontier-types';
import {
  KnexUrlFrontierRepository,
  normalizeFrontierUrl,
  UrlCanonicalRelationRow,
  UrlFrontierEntryRow,
  urlFrontierHash,
} from '../persistence/knex-url-frontier.repository';

@Injectable()
export class UrlFrontierCanonicalService {
  constructor(private readonly repository: KnexUrlFrontierRepository) {}

  async recordCanonicalRelation(
    command: UrlFrontierCanonicalRelationCommand,
  ): Promise<UrlFrontierCanonicalRelationResult> {
    const source = await this.repository.findEntryById(
      command.sourceFrontierEntryId,
    );
    if (!source) {
      return rejected(null, 'source_entry_missing');
    }

    const targetNormalizedUrl = normalizeFrontierUrl(command.targetCanonicalUrl);
    if (!targetNormalizedUrl) {
      const relationId = await this.recordRelation(
        command,
        source,
        command.targetCanonicalUrl,
        '',
        null,
        false,
        'malformed_target_url',
      );
      return rejected(relationId, 'malformed_target_url');
    }

    const targetHash = urlFrontierHash(targetNormalizedUrl);
    if (targetHash === source.normalized_url_hash) {
      return {
        status: 'self_canonical',
        relationId: null,
        targetFrontierEntryId: source.id,
        reason: null,
      };
    }

    const policyRejection = canonicalPolicyRejection(source, targetNormalizedUrl);
    if (policyRejection) {
      const relationId = await this.recordRelation(
        command,
        source,
        targetNormalizedUrl,
        targetHash,
        null,
        false,
        policyRejection,
      );
      return rejected(relationId, policyRejection);
    }

    const target = await this.repository.findEntryByTopicAndUrlHash(
      source.topic_id,
      targetHash,
    );
    const relationId = await this.recordRelation(
      command,
      source,
      targetNormalizedUrl,
      targetHash,
      target,
      true,
      null,
    );

    if (!target) {
      return {
        status: 'recorded_unresolved',
        relationId,
        targetFrontierEntryId: null,
        reason: 'target_entry_missing',
      };
    }

    await this.repository.suppressCanonicalDuplicate(
      source.id,
      targetNormalizedUrl,
      command.evidenceType,
      command.now,
    );

    return {
      status: 'consolidated',
      relationId,
      targetFrontierEntryId: target.id,
      reason: null,
    };
  }

  private async recordRelation(
    command: UrlFrontierCanonicalRelationCommand,
    source: UrlFrontierEntryRow,
    targetNormalizedUrl: string,
    targetHash: string,
    target: UrlFrontierEntryRow | null,
    accepted: boolean,
    rejectionReason: string | null,
  ): Promise<string> {
    const relationId = randomUUID();
    const row: UrlCanonicalRelationRow = {
      id: relationId,
      topic_id: source.topic_id,
      source_frontier_entry_id: source.id,
      target_frontier_entry_id: target?.id ?? null,
      source_normalized_url: source.normalized_url,
      target_normalized_url: targetNormalizedUrl,
      target_normalized_url_hash: targetHash,
      evidence_type: command.evidenceType,
      evidence: command.evidence,
      accepted,
      rejection_reason: rejectionReason,
      created_at: command.now,
    };
    await this.repository.insertCanonicalRelation(row);
    return relationId;
  }
}

function canonicalPolicyRejection(
  source: UrlFrontierEntryRow,
  targetNormalizedUrl: string,
): string | null {
  const target = new URL(targetNormalizedUrl);
  const policy = source.crawl_policy;
  if (policy.deniedHosts?.includes(target.hostname)) {
    return 'target_denied_host';
  }
  if (policy.allowedHosts && !policy.allowedHosts.includes(target.hostname)) {
    return 'target_host_not_allowed';
  }
  if (
    policy.crossHostCanonicalPolicy === 'same-host' &&
    target.hostname !== new URL(source.normalized_url).hostname
  ) {
    return 'cross_host_canonical_not_allowed';
  }
  return null;
}

function rejected(
  relationId: string | null,
  reason: string,
): UrlFrontierCanonicalRelationResult {
  return {
    status: 'rejected',
    relationId,
    targetFrontierEntryId: null,
    reason,
  };
}
