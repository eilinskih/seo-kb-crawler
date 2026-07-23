import {
  TopicExpansionPack,
  TopicExpansionRequest,
} from './domain/topic-expansion-types';
import { ExpansionCandidateService } from './expansion-candidate.service';
import { ExpansionClusterService } from './expansion-cluster.service';
import { ExpansionSignalService } from './expansion-signal.service';
import { normalizeExpansionText } from './normalize-expansion-text';
import { DEFAULT_TOPIC_EXPANSION_RULE_VERSION } from './topic-expansion-defaults';

export class ExpansionPackService {
  constructor(
    private readonly signalService = new ExpansionSignalService(),
    private readonly candidateService = new ExpansionCandidateService(),
    private readonly clusterService = new ExpansionClusterService(),
  ) {}

  build(request: TopicExpansionRequest): TopicExpansionPack {
    const signals = this.signalService.normalize(request.inputSignals);
    const candidates = this.candidateService.generate(signals, request);
    const clusters = this.clusterService.cluster(candidates);
    const degraded = Boolean(request.degraded) || signals.length === 0;

    return {
      topicId: request.topicId,
      normalizedTopicLabel: normalizeExpansionText(request.topicLabel),
      language: request.language,
      geo: request.geo,
      sourcePackReferences: request.sourcePackReferences ?? [],
      clusters,
      candidates,
      warnings: [
        ...(request.warnings ?? []),
        ...(signals.length === 0
          ? ['Expansion Pack built without input signals']
          : []),
      ],
      degraded,
      ruleVersion: request.ruleVersion ?? DEFAULT_TOPIC_EXPANSION_RULE_VERSION,
    };
  }
}
