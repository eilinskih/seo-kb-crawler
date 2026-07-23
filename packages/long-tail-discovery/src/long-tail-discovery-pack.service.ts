import {
  LongTailCandidate,
  LongTailDiscoveryPack,
  LongTailDiscoveryRequest,
} from './domain/long-tail-discovery-types';
import {
  DEFAULT_LONG_TAIL_RULES,
  DEFAULT_LONG_TAIL_RULE_VERSION,
} from './long-tail-defaults';
import { LongTailDimensionService } from './long-tail-dimension.service';
import { CombinationRuleService } from './combination-rule.service';
import { LongTailCandidateService } from './long-tail-candidate.service';
import { OpportunityTreeService } from './opportunity-tree.service';
import { normalizeLongTailText } from './normalize-long-tail-text';

export class LongTailDiscoveryPackService {
  constructor(
    private readonly dimensionService = new LongTailDimensionService(),
    private readonly ruleService = new CombinationRuleService(),
    private readonly candidateService = new LongTailCandidateService(),
    private readonly treeService = new OpportunityTreeService(),
  ) {}

  build(request: LongTailDiscoveryRequest): LongTailDiscoveryPack {
    const dimensions = this.dimensionService.extract(request.dimensionInputs);
    const rules = request.rules ?? DEFAULT_LONG_TAIL_RULES;
    const degraded = Boolean(request.degraded) || dimensions.length === 0;
    const candidates = rules.flatMap<LongTailCandidate>((rule) =>
      this.candidateService.buildCandidates({
        topicId: request.topicId,
        rule,
        combinations: this.ruleService.combinationsForRule(
          rule,
          dimensions,
          degraded,
        ),
        degraded,
      }),
    ).slice(0, request.maxCandidatesPerRun ?? 100);
    const opportunityTrees = this.treeService.build(candidates);

    return {
      topicId: request.topicId,
      normalizedTopicLabel: normalizeLongTailText(request.topicLabel),
      language: request.language,
      geo: request.geo,
      sourcePackReferences: request.sourcePackReferences ?? [],
      dimensions,
      combinationRulesApplied: rules.map((rule) => rule.ruleKey),
      opportunityTrees,
      candidates,
      warnings: [
        ...(request.warnings ?? []),
        ...(dimensions.length === 0
          ? ['Long-tail Discovery Pack built without dimensions']
          : []),
      ],
      degraded,
      ruleVersion: request.ruleVersion ?? DEFAULT_LONG_TAIL_RULE_VERSION,
    };
  }
}
