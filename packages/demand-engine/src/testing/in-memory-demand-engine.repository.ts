import { normalizeKeyword } from '../normalize-keyword';
import {
  ApplyPhraseAnalysisToKeywordCandidateCommand,
  DemandCandidatePageRecord,
  DemandDiscoveryPersistenceResult,
  DemandEngineRepository,
  DemandKeywordCandidateRecord,
  DemandMetricSnapshotRecord,
  DemandObservationRecord,
  MarkCandidatePagesSerpValidatedCommand,
  SaveDemandDiscoveryResultCommand,
} from '../persistence/demand-engine.repository';

export class InMemoryDemandEngineRepository implements DemandEngineRepository {
  private readonly candidates = new Map<string, DemandKeywordCandidateRecord>();
  private readonly observations: DemandObservationRecord[] = [];
  private readonly metricSnapshots: DemandMetricSnapshotRecord[] = [];
  private readonly pages = new Map<string, DemandCandidatePageRecord>();

  async saveDiscoveryResult(
    command: SaveDemandDiscoveryResultCommand,
  ): Promise<DemandDiscoveryPersistenceResult> {
    const keywordCandidates = command.result.keywordCandidates.map((candidate) => {
      const key = candidateKey(command.topicId, candidate.normalizedKeyword);
      const existing = this.candidates.get(key);
      const record: DemandKeywordCandidateRecord = {
        ...candidate,
        id: existing?.id ?? `demand-keyword-candidate-${this.candidates.size + 1}`,
        topicId: command.topicId ?? null,
        phraseAnalysisUpdatedAt: candidate.phraseAnalysis ? command.observedAt : null,
        phraseAnalysisAttemptId: null,
        lastObservedAt: command.observedAt,
        createdAt: existing?.createdAt ?? command.observedAt,
        updatedAt: command.observedAt,
      };
      this.candidates.set(key, record);
      return record;
    });

    const candidateByKeyword = new Map(
      keywordCandidates.map((candidate) => [candidate.normalizedKeyword, candidate]),
    );
    const observations = command.result.observations.map((observation) => {
      const normalizedKeyword = normalizeKeyword(observation.observedText);
      const candidate = candidateByKeyword.get(normalizedKeyword);
      const record: DemandObservationRecord = {
        ...observation,
        id: `demand-observation-${this.observations.length + 1}`,
        keywordCandidateId: candidate?.id ?? 'unknown',
        topicId: command.topicId ?? null,
        observedAt: command.observedAt,
        createdAt: command.observedAt,
      };
      this.observations.push(record);
      return record;
    });

    const metricSnapshots = keywordCandidates.map((candidate) => {
      const record: DemandMetricSnapshotRecord = {
        ...candidate.metrics,
        id: `demand-metric-snapshot-${this.metricSnapshots.length + 1}`,
        keywordCandidateId: candidate.id,
        topicId: command.topicId ?? null,
        metadata: {
          confidence: candidate.confidence,
          providers: candidate.providers,
          sourceTiers: candidate.sourceTiers,
        },
        createdAt: command.observedAt,
      };
      this.metricSnapshots.push(record);
      return record;
    });

    const candidatePages = command.result.candidatePages.map((page) => {
      const candidate = candidateByKeyword.get(page.primaryKeyword);
      const key = `${command.topicId ?? 'global'}:${page.slug}`;
      const existing = this.pages.get(key);
      const evidenceTypes = unique(page.evidenceTypes);
      const record: DemandCandidatePageRecord = {
        ...page,
        readiness: page.readiness ?? readinessFromConfidence(page.confidence),
        evidenceTypes,
        evidenceUrls: unique(page.evidenceUrls ?? []),
        missingResearchGaps: unresolvedResearchGaps(
          page.missingResearchGaps ?? [],
          evidenceTypes,
        ),
        id: existing?.id ?? `demand-candidate-page-${this.pages.size + 1}`,
        keywordCandidateId: candidate?.id ?? 'unknown',
        topicId: command.topicId ?? null,
        phraseAnalysisUpdatedAt: page.phraseAnalysis ? command.observedAt : null,
        phraseAnalysisAttemptId: null,
        createdAt: existing?.createdAt ?? command.observedAt,
        updatedAt: command.observedAt,
      };
      this.pages.set(key, record);
      return record;
    });
    const currentPageKeys = new Set(
      command.result.candidatePages.map((page) =>
        `${command.topicId ?? 'global'}:${page.slug}`,
      ),
    );
    for (const key of this.pages.keys()) {
      if (key.startsWith(`${command.topicId ?? 'global'}:`) &&
        !currentPageKeys.has(key)) {
        this.pages.delete(key);
      }
    }
    const currentCandidateKeys = new Set(
      command.result.keywordCandidates.map((candidate) =>
        candidateKey(command.topicId, candidate.normalizedKeyword),
      ),
    );
    for (const key of this.candidates.keys()) {
      if (key.startsWith(`${command.topicId ?? 'global'}:`) &&
        !currentCandidateKeys.has(key)) {
        this.candidates.delete(key);
      }
    }

    return {
      keywordCandidates,
      observations,
      metricSnapshots,
      candidatePages,
    };
  }

  async listKeywordCandidates(topicId: string): Promise<DemandKeywordCandidateRecord[]> {
    return [...this.candidates.values()].filter((candidate) =>
      candidate.topicId === topicId,
    );
  }

  async findKeywordCandidateById(
    keywordCandidateId: string,
  ): Promise<DemandKeywordCandidateRecord | null> {
    return [...this.candidates.values()].find((candidate) =>
      candidate.id === keywordCandidateId,
    ) ?? null;
  }

  async applyPhraseAnalysisToKeywordCandidate(
    command: ApplyPhraseAnalysisToKeywordCandidateCommand,
  ): Promise<DemandKeywordCandidateRecord | null> {
    const entry = [...this.candidates.entries()].find(([, candidate]) =>
      candidate.id === command.keywordCandidateId,
    );
    if (!entry) {
      return null;
    }
    const [candidateKeyValue, candidate] = entry;
    if (candidate.updatedAt !== command.candidateUpdatedAt) {
      return null;
    }

    const updatedCandidate: DemandKeywordCandidateRecord = {
      ...candidate,
      phraseAnalysis: command.phraseAnalysis,
      phraseAnalysisUpdatedAt: command.appliedAt,
      phraseAnalysisAttemptId: command.externalEntityAttemptId ?? null,
      updatedAt: command.appliedAt,
    };
    this.candidates.set(candidateKeyValue, updatedCandidate);

    for (const [pageKey, page] of this.pages.entries()) {
      if (page.keywordCandidateId !== command.keywordCandidateId) {
        continue;
      }
      this.pages.set(pageKey, {
        ...page,
        phraseAnalysis: command.phraseAnalysis,
        phraseAnalysisUpdatedAt: command.appliedAt,
        phraseAnalysisAttemptId: command.externalEntityAttemptId ?? null,
        updatedAt: command.appliedAt,
      });
    }

    return updatedCandidate;
  }

  async markCandidatePagesSerpValidated(
    command: MarkCandidatePagesSerpValidatedCommand,
  ): Promise<DemandCandidatePageRecord[]> {
    const updated: DemandCandidatePageRecord[] = [];
    for (const [key, page] of this.pages.entries()) {
      if (page.topicId !== command.topicId) {
        continue;
      }
      const matches = command.validations.filter((validation) =>
        pageMatchesQuery(page, validation.query),
      );
      if (matches.length === 0) {
        continue;
      }
      const record: DemandCandidatePageRecord = {
        ...page,
        readiness: readinessAfterSerpValidation(
          page.readiness,
          matches.flatMap((validation) => validation.evidenceUrls),
          highestValidationQuality(matches.map((validation) =>
            validation.evidenceQuality ?? evidenceQualityFromUrlCount(validation.evidenceUrls.length),
          )),
        ),
        evidenceTypes: unique([...page.evidenceTypes, 'serp_snippet']),
        evidenceUrls: unique([
          ...(page.evidenceUrls ?? []),
          ...matches.flatMap((validation) => validation.evidenceUrls),
        ]),
        missingResearchGaps: nextResearchGaps(
          page.missingResearchGaps ?? [],
          matches.flatMap((validation) => validation.evidenceUrls),
          highestValidationQuality(matches.map((validation) =>
            validation.evidenceQuality ?? evidenceQualityFromUrlCount(validation.evidenceUrls.length),
          )),
        ),
        updatedAt: command.validatedAt,
      };
      this.pages.set(key, record);
      updated.push(record);
    }
    return updated;
  }

  async listCandidatePages(topicId: string): Promise<DemandCandidatePageRecord[]> {
    return [...this.pages.values()].filter((page) => page.topicId === topicId);
  }
}

function candidateKey(topicId: string | undefined, normalizedKeyword: string): string {
  return `${topicId ?? 'global'}:${normalizedKeyword}`;
}

function readinessFromConfidence(
  confidence: DemandCandidatePageRecord['confidence'],
): NonNullable<DemandCandidatePageRecord['readiness']> {
  if (confidence === 'high') {
    return 'ready';
  }
  if (confidence === 'medium') {
    return 'partial';
  }
  return 'not_ready';
}

function pageMatchesQuery(page: DemandCandidatePageRecord, query: string): boolean {
  const normalizedQuery = normalizeKeyword(query);
  return page.primaryKeyword === normalizedQuery ||
    page.supportingKeywords.includes(normalizedQuery);
}

function unique<Value>(values: Value[]): Value[] {
  return [...new Set(values)];
}

function unresolvedResearchGaps(
  gaps: string[],
  evidenceTypes: DemandCandidatePageRecord['evidenceTypes'],
): string[] {
  return gaps.filter((gap) =>
    gap !== 'SERP validation evidence' ||
    !evidenceTypes.includes('serp_snippet'),
  );
}

function nextResearchGaps(
  gaps: string[],
  evidenceUrls: string[],
  quality: 'weak' | 'medium' | 'strong',
): string[] {
  const next = gaps.filter((gap) =>
    gap !== 'SERP validation evidence' || evidenceUrls.length === 0,
  );
  if (quality !== 'strong' && !next.includes('Strong SERP relevance evidence')) {
    next.push('Strong SERP relevance evidence');
  }
  return next;
}

function readinessAfterSerpValidation(
  current: DemandCandidatePageRecord['readiness'] | undefined,
  evidenceUrls: string[],
  quality: 'weak' | 'medium' | 'strong',
): NonNullable<DemandCandidatePageRecord['readiness']> {
  if (quality === 'strong' && evidenceUrls.length >= 3) {
    return 'ready';
  }
  if (quality === 'medium' && evidenceUrls.length >= 3) {
    return highestReadiness([current, 'partial']);
  }
  return current === 'ready' ? 'partial' : current ?? 'not_ready';
}

function evidenceQualityFromUrlCount(count: number): 'weak' | 'medium' | 'strong' {
  if (count >= 7) {
    return 'strong';
  }
  if (count >= 3) {
    return 'medium';
  }
  return 'weak';
}

function highestValidationQuality(
  values: Array<'weak' | 'medium' | 'strong'>,
): 'weak' | 'medium' | 'strong' {
  return values.sort((a, b) => validationQualityRank(b) - validationQualityRank(a))[0] ?? 'weak';
}

function validationQualityRank(value: 'weak' | 'medium' | 'strong'): number {
  return {
    weak: 0,
    medium: 1,
    strong: 2,
  }[value];
}

function highestReadiness(
  values: Array<DemandCandidatePageRecord['readiness'] | undefined>,
): NonNullable<DemandCandidatePageRecord['readiness']> {
  return values
    .filter((value): value is NonNullable<DemandCandidatePageRecord['readiness']> =>
      value !== undefined,
    )
    .sort((a, b) => readinessRank(b) - readinessRank(a))[0] ?? 'not_ready';
}

function readinessRank(
  value: NonNullable<DemandCandidatePageRecord['readiness']>,
): number {
  return {
    not_ready: 0,
    partial: 1,
    ready: 2,
  }[value];
}
