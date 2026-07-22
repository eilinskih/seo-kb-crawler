import { Injectable } from '@nestjs/common';
import {
  ConflictSet,
  ConflictSeverity,
  ConsensusGroup,
} from './domain/seo-consensus-types';

@Injectable()
export class ConflictDetectionService {
  detect(groups: ConsensusGroup[]): ConflictSet[] {
    return groups
      .filter((group) => hasConflict(group))
      .map((group) => ({
        conflictKey: `${group.groupKey}:conflict`,
        groupKey: group.groupKey,
        subjectEntityId: group.subjectEntityId,
        predicateId: group.predicateId,
        comparableKey: group.comparableKey,
        alternatives: group.alternatives,
        severity: severity(group),
        suggestedHandling: suggestedHandling(group),
      }));
  }
}

function hasConflict(group: ConsensusGroup): boolean {
  const comparableAlternatives = group.alternatives.filter(
    (alternative) => alternative.value.kind !== 'comparison_deferred',
  );
  return comparableAlternatives.length > 1;
}

function severity(group: ConsensusGroup): ConflictSeverity {
  const supportedAlternatives = group.alternatives.filter(
    (alternative) =>
      alternative.value.kind !== 'comparison_deferred' &&
      alternative.supportingDomainCount > 0,
  );
  if (supportedAlternatives.length >= 2 && group.supportingDomainCount >= 3) {
    return 'high';
  }
  if (supportedAlternatives.length >= 2) {
    return 'medium';
  }
  return 'low';
}

function suggestedHandling(
  group: ConsensusGroup,
): ConflictSet['suggestedHandling'] {
  if (severity(group) === 'high') {
    return 'compare_values';
  }
  if (group.confidenceLevel === 'weak') {
    return 'avoid_claim';
  }
  return 'phrase_cautiously';
}
