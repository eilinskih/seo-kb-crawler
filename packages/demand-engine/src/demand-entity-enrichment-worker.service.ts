import { Inject, Injectable } from '@nestjs/common';
import { ExternalEntityEnrichmentService } from '@seo-kb/external-entity-enrichment';
import { DEMAND_ENGINE_REPOSITORY } from './demand-engine.tokens';
import { KeywordCandidate } from './domain/demand-engine-types';
import { DemandEntityEnrichmentJob } from './demand-entity-enrichment-queue';
import {
  DemandEngineRepository,
} from './persistence/demand-engine.repository';
import {
  EntityEnrichedPhraseAnalysisProvider,
} from './phrase-analysis/entity-enriched-phrase-analysis.provider';
import { FreePhraseAnalysisProvider } from './phrase-analysis/free-phrase-analysis.provider';

export interface DemandEntityEnrichmentJobResult {
  status: 'applied' | 'stale' | 'missing_candidate';
  keywordCandidateId: string;
  externalEntityAttemptId?: string | null;
}

@Injectable()
export class DemandEntityEnrichmentWorkerService {
  constructor(
    @Inject(DEMAND_ENGINE_REPOSITORY)
    private readonly repository: DemandEngineRepository,
    private readonly entityEnrichment: ExternalEntityEnrichmentService,
  ) {}

  async process(
    job: DemandEntityEnrichmentJob,
  ): Promise<DemandEntityEnrichmentJobResult> {
    const candidate = await this.repository.findKeywordCandidateById(
      job.keywordCandidateId,
    );
    if (!candidate) {
      return {
        status: 'missing_candidate',
        keywordCandidateId: job.keywordCandidateId,
      };
    }
    if (candidate.updatedAt !== job.candidateUpdatedAt) {
      return {
        status: 'stale',
        keywordCandidateId: job.keywordCandidateId,
      };
    }

    const provider = new EntityEnrichedPhraseAnalysisProvider(
      this.entityEnrichment,
      {
        fallbackProvider: new FreePhraseAnalysisProvider(),
      },
    );
    const phraseAnalysis = await provider.analyze({
      phrase: candidate.normalizedKeyword,
      topicSeed: job.topicSeed,
      language: candidate.language,
      evidenceTypes: candidate.evidenceTypes,
    });
    const externalEntityAttemptId = await this.findLatestAttemptId(
      candidate.normalizedKeyword,
      job.queuedAt,
    );
    const applied = await this.repository.applyPhraseAnalysisToKeywordCandidate({
      keywordCandidateId: candidate.id,
      candidateUpdatedAt: job.candidateUpdatedAt,
      phraseAnalysis: toKeywordPhraseAnalysis(phraseAnalysis),
      externalEntityAttemptId,
      appliedAt: new Date().toISOString(),
    });

    return {
      status: applied ? 'applied' : 'stale',
      keywordCandidateId: job.keywordCandidateId,
      externalEntityAttemptId,
    };
  }

  private async findLatestAttemptId(
    entityName: string,
    notBefore: string,
  ): Promise<string | null> {
    const pack = await this.entityEnrichment.findLatestPack(entityName);
    if (!pack || Date.parse(pack.createdAt) < Date.parse(notBefore)) {
      return null;
    }
    return pack.id;
  }
}

function toKeywordPhraseAnalysis(
  phraseAnalysis: Awaited<ReturnType<EntityEnrichedPhraseAnalysisProvider['analyze']>>,
): NonNullable<KeywordCandidate['phraseAnalysis']> {
  return {
    providerKey: phraseAnalysis.providerKey,
    candidateKind: phraseAnalysis.candidateKind,
    confidence: phraseAnalysis.confidence,
    entityEvidence: phraseAnalysis.entityEvidence?.map((evidence) => ({
      text: evidence.text,
      providerKey: evidence.providerKey,
      externalId: evidence.externalId,
      name: evidence.name,
      types: evidence.types,
      confidence: evidence.confidence,
    })),
    reasons: phraseAnalysis.reasons,
  };
}
