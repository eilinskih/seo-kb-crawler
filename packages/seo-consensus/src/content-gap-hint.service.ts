import { Injectable } from '@nestjs/common';
import {
  ConsensusGroup,
  ContentGapHint,
} from './domain/seo-consensus-types';

@Injectable()
export class ContentGapHintService {
  fromConsensusGroup(group: ConsensusGroup): ContentGapHint[] {
    const hints: ContentGapHint[] = [];
    if (group.confidenceLevel === 'weak') {
      hints.push({
        targetKey: group.groupKey,
        gapType: 'weak_support',
        reason: 'Consensus group has weak support',
        suggestedAngle: 'Add corroborating evidence or phrase cautiously',
      });
    }
    if (group.alternatives.some((alternative) =>
      alternative.value.kind === 'comparison_deferred',
    )) {
      hints.push({
        targetKey: group.groupKey,
        gapType: 'comparison_deferred',
        reason: 'At least one fact value cannot be compared deterministically',
        suggestedAngle: 'Review the claim shape before using it as a hard fact',
      });
    }
    return hints;
  }
}
