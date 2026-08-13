import { Injectable } from '@nestjs/common';
import { ChunkingResult } from './domain/chunking-types';
import { ChunkingService } from './chunking.service';
import { KnexChunkingRepository } from './persistence/knex-chunking.repository';

export interface ChunkingDispatchOptions {
  limit: number;
  now: Date;
}

export interface ChunkingDispatchResult {
  candidateCount: number;
  chunkedCount: number;
  alreadyChunkedCount: number;
  results: ChunkingResult[];
}

@Injectable()
export class ChunkingDispatchService {
  constructor(
    private readonly repository: KnexChunkingRepository,
    private readonly chunkingService: ChunkingService,
  ) {}

  async dispatchUnchunkedDocumentVersions(
    options: ChunkingDispatchOptions,
  ): Promise<ChunkingDispatchResult> {
    assertPositiveInteger(options.limit, 'limit');

    const documentVersionIds =
      await this.repository.findUnchunkedDocumentVersionIds({
        limit: options.limit,
      });
    const results: ChunkingResult[] = [];

    for (const documentVersionId of documentVersionIds) {
      results.push(await this.chunkingService.chunkDocumentVersion({
        documentVersionId,
        now: options.now,
      }));
    }

    return {
      candidateCount: documentVersionIds.length,
      chunkedCount: results.filter((result) => result.status === 'chunked').length,
      alreadyChunkedCount: results.filter((result) =>
        result.status === 'already_chunked',
      ).length,
      results,
    };
  }
}

function assertPositiveInteger(value: number, field: string): void {
  if (!Number.isInteger(value) || value < 1) {
    throw new Error(`${field} must be a positive integer`);
  }
}
