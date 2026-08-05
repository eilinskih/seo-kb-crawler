import {
  PlanningPackFreshnessItem,
  PlanningPackFreshnessReport,
  PlanningPackFreshnessRequest,
  PlanningPackRequirement,
  PlanningPackSnapshot,
} from './domain/research-scheduling-types';

export class PlanningPackFreshnessService {
  evaluate(request: PlanningPackFreshnessRequest): PlanningPackFreshnessReport {
    const items = request.requirements.map((requirement) =>
      this.itemForRequirement(requirement, request),
    );

    return {
      topicId: request.topicId,
      candidateKey: request.candidateKey ?? null,
      observedAt: request.observedAt,
      refreshRequired: items.some((item) => item.refreshRequired),
      missingRequiredCount: items.filter((item) =>
        item.required && item.status === 'missing',
      ).length,
      staleCount: items.filter((item) => item.status === 'stale').length,
      items,
    };
  }

  private itemForRequirement(
    requirement: PlanningPackRequirement,
    request: PlanningPackFreshnessRequest,
  ): PlanningPackFreshnessItem {
    const pack = latestPack(requirement, request.existingPacks, request.candidateKey);
    if (!pack) {
      return {
        packType: requirement.packType,
        status: 'missing',
        required: requirement.required,
        packId: null,
        createdAt: null,
        ageHours: null,
        ttlHours: requirement.ttlHours,
        refreshRequired: requirement.required,
        reason: requirement.required
          ? 'Required planning pack is missing.'
          : 'Optional planning pack is missing.',
        warnings: [],
      };
    }

    const ageHours = hoursBetween(pack.createdAt, request.observedAt);
    const stale = ageHours === null || ageHours > requirement.ttlHours;

    return {
      packType: requirement.packType,
      status: stale ? 'stale' : 'fresh',
      required: requirement.required,
      packId: pack.packId,
      createdAt: pack.createdAt,
      ageHours,
      ttlHours: requirement.ttlHours,
      refreshRequired: stale,
      reason: stale
        ? 'Planning pack exceeded its freshness TTL.'
        : 'Planning pack is fresh enough to reuse.',
      warnings: pack.warnings ?? [],
    };
  }
}

function latestPack(
  requirement: PlanningPackRequirement,
  packs: PlanningPackSnapshot[],
  candidateKey?: string,
): PlanningPackSnapshot | null {
  const candidates = packs
    .filter((pack) => pack.packType === requirement.packType)
    .filter((pack) =>
      requirement.packType === 'seo_pack' && candidateKey
        ? pack.candidateKey === candidateKey
        : true,
    )
    .sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt));

  return candidates[0] ?? null;
}

function hoursBetween(createdAt: string, observedAt: string): number | null {
  const created = Date.parse(createdAt);
  const observed = Date.parse(observedAt);
  if (Number.isNaN(created) || Number.isNaN(observed)) {
    return null;
  }
  return Math.max(0, (observed - created) / (60 * 60 * 1000));
}
