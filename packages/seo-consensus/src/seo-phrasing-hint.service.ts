import { Injectable } from '@nestjs/common';
import {
  ConflictSet,
  ConsensusGroup,
  SeoPhrasingHint,
} from './domain/seo-consensus-types';

@Injectable()
export class SeoPhrasingHintService {
  forConsensusGroup(group: ConsensusGroup): SeoPhrasingHint {
    if (group.strongestAlternative === null) {
      return {
        targetType: 'consensus_group',
        targetKey: group.groupKey,
        hintType: 'needs_evidence',
        message: 'Add evidence before making this claim',
        payload: { reason: 'no_supported_alternative' },
      };
    }
    if (group.confidenceLevel === 'strong') {
      return {
        targetType: 'consensus_group',
        targetKey: group.groupKey,
        hintType: 'confident',
        message: 'Use confident phrasing and cite supporting sources',
        payload: { value: group.strongestAlternative.value.summary },
      };
    }
    return {
      targetType: 'consensus_group',
      targetKey: group.groupKey,
      hintType: 'cautious',
      message: 'Use cautious phrasing because support is limited',
      payload: {
        confidenceLevel: group.confidenceLevel,
        value: group.strongestAlternative.value.summary,
      },
    };
  }

  forConflictSet(conflict: ConflictSet): SeoPhrasingHint {
    return {
      targetType: 'conflict_set',
      targetKey: conflict.conflictKey,
      hintType: conflict.suggestedHandling === 'compare_values'
        ? 'comparison'
        : 'cautious',
      message: 'Sources disagree; preserve comparison or cautious phrasing',
      payload: {
        severity: conflict.severity,
        alternatives: conflict.alternatives.map((alternative) =>
          alternative.value.summary,
        ),
      },
    };
  }
}
