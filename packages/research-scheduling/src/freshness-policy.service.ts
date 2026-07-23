import {
  FreshnessDecision,
  FreshnessEvidence,
  RefreshReason,
} from './domain/research-scheduling-types';

export class FreshnessPolicyService {
  decide(evidence: FreshnessEvidence): FreshnessDecision {
    const reasons = this.reasons(evidence);
    const forceRefresh =
      evidence.policyChanged ||
      evidence.ontologyUpdated ||
      evidence.entityMissing ||
      evidence.contentHashChanged;
    const status =
      reasons.length === 0 ? 'reuse' : forceRefresh ? 'force_refresh' : 'refresh';

    return {
      assetKey: evidence.assetKey,
      status,
      reasons,
      reuseExistingAssets: status === 'reuse',
      shouldCrawl:
        status !== 'reuse' &&
        (reasons.includes('ttl_expired') ||
          reasons.includes('content_changed') ||
          reasons.includes('policy_changed')),
      shouldProcess:
        status !== 'reuse' &&
        (reasons.includes('content_changed') ||
          reasons.includes('ontology_updated') ||
          reasons.includes('entity_missing')),
      shouldRefreshSerp:
        status !== 'reuse' &&
        (reasons.includes('serp_changed') || !evidence.lastSerpSnapshotAt),
      warnings:
        status === 'reuse'
          ? []
          : [`Freshness decision requires ${status.replace('_', ' ')}`],
    };
  }

  private reasons(evidence: FreshnessEvidence): RefreshReason[] {
    const reasons: RefreshReason[] = [];
    if (this.ttlExpired(evidence)) {
      reasons.push('ttl_expired');
    }
    if (!evidence.lastSerpSnapshotAt) {
      reasons.push('serp_changed');
    }
    if (evidence.contentHashChanged || evidence.etagChanged || evidence.lastModifiedChanged) {
      reasons.push('content_changed');
    }
    if (evidence.entityMissing) {
      reasons.push('entity_missing');
    }
    if (evidence.ontologyUpdated) {
      reasons.push('ontology_updated');
    }
    if (evidence.policyChanged) {
      reasons.push('policy_changed');
    }
    return [...new Set(reasons)];
  }

  private ttlExpired(evidence: FreshnessEvidence): boolean {
    const lastSeen = evidence.lastProcessedAt ?? evidence.lastCrawledAt;
    if (!lastSeen) {
      return true;
    }

    const elapsedMs =
      new Date(evidence.now).getTime() - new Date(lastSeen).getTime();
    return elapsedMs >= evidence.ttlHours * 60 * 60 * 1000;
  }
}
