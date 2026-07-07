import { Inject, Injectable } from '@nestjs/common';
import { rankRetrievalCandidates } from './domain/retrieval-ranker';
import {
  RetrievalCandidate,
  RetrievalQuery,
  RetrievalRepository,
  RetrievalResponse,
} from './domain/retrieval-types';
import { RETRIEVAL_REPOSITORY } from './retrieval.tokens';

@Injectable()
export class RetrievalService {
  constructor(
    @Inject(RETRIEVAL_REPOSITORY)
    private readonly repository: RetrievalRepository,
  ) {}

  async search(query: RetrievalQuery): Promise<RetrievalResponse> {
    const warnings: string[] = [];
    const candidates: RetrievalCandidate[] = [];
    let vectorAvailable = true;

    try {
      candidates.push(...await this.repository.searchVector(query));
    } catch (error) {
      vectorAvailable = false;
      warnings.push(
        `Vector retrieval unavailable: ${error instanceof Error ? error.message : 'unknown error'}`,
      );
    }

    try {
      candidates.push(...await this.repository.searchKeyword(query));
    } catch (error) {
      warnings.push(
        `Keyword retrieval unavailable: ${error instanceof Error ? error.message : 'unknown error'}`,
      );
    }

    if (candidates.length === 0 && query.allowBroadFallback) {
      candidates.push(...await this.repository.searchMetadata(query));
    }

    if (!vectorAvailable) {
      warnings.push('Vector results unavailable; used degraded retrieval mode');
    }

    return {
      results: rankRetrievalCandidates(query, candidates, warnings),
      warnings,
      degraded: warnings.length > 0,
    };
  }
}
