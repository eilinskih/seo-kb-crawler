import { InjectQueue } from '@nestjs/bullmq';
import { Injectable, Optional } from '@nestjs/common';
import { EXTERNAL_ENTITY_ENRICHMENT_QUEUE_NAME } from '@seo-kb/common';
import { Queue } from 'bullmq';
import {
  DemandDiscoveryResult,
  KeywordCandidate,
} from './domain/demand-engine-types';
import { DemandDiscoveryPersistenceResult } from './persistence/demand-engine.repository';

export interface DemandEntityEnrichmentJob {
  topicId: string | null;
  topicSeed: string;
  keywordCandidateId: string;
  normalizedKeyword: string;
  language?: string;
  evidenceTypes: KeywordCandidate['evidenceTypes'];
  candidateUpdatedAt: string;
  queuedAt: string;
}

export interface DispatchDemandEntityEnrichmentCommand {
  topicSeed: string;
  topicId?: string;
  discovery: DemandDiscoveryResult;
  persistence: DemandDiscoveryPersistenceResult;
  queuedAt: string;
}

@Injectable()
export class DemandEntityEnrichmentDispatchService {
  constructor(
    @Optional()
    @InjectQueue(EXTERNAL_ENTITY_ENRICHMENT_QUEUE_NAME)
    private readonly queue?: Queue<DemandEntityEnrichmentJob>,
  ) {}

  async dispatch(
    command: DispatchDemandEntityEnrichmentCommand,
  ): Promise<number> {
    if (!this.queue) {
      return 0;
    }

    const discoveryByKeyword = new Map(
      command.discovery.keywordCandidates.map((candidate) => [
        candidate.normalizedKeyword,
        candidate,
      ]),
    );
    let enqueued = 0;

    for (const record of command.persistence.keywordCandidates) {
      const candidate = discoveryByKeyword.get(record.normalizedKeyword);
      if (!candidate || hasEntityEvidence(candidate)) {
        continue;
      }

      await this.queue.add(
        EXTERNAL_ENTITY_ENRICHMENT_QUEUE_NAME,
        {
          topicId: record.topicId,
          topicSeed: command.topicSeed,
          keywordCandidateId: record.id,
          normalizedKeyword: record.normalizedKeyword,
          language: record.language,
          evidenceTypes: record.evidenceTypes,
          candidateUpdatedAt: record.updatedAt,
          queuedAt: command.queuedAt,
        },
        {
          jobId: demandEntityEnrichmentJobId(record.id),
          attempts: 3,
          backoff: {
            type: 'exponential',
            delay: 60_000,
          },
          removeOnComplete: true,
          removeOnFail: true,
        },
      );
      enqueued += 1;
    }

    return enqueued;
  }
}

function demandEntityEnrichmentJobId(keywordCandidateId: string): string {
  return ['demand-entity-enrichment', keywordCandidateId].join('-');
}

function hasEntityEvidence(candidate: KeywordCandidate): boolean {
  return (candidate.phraseAnalysis?.entityEvidence?.length ?? 0) > 0;
}
