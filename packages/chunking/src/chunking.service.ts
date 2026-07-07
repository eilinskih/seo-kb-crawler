import { Inject, Injectable } from '@nestjs/common';
import {
  ChunkingRepository,
  ChunkingResult,
} from './domain/chunking-types';
import {
  buildChunkingPlan,
  DEFAULT_CHUNKER_VERSION,
} from './domain/semantic-chunker';
import { Tokenizer, WhitespaceTokenizer } from './domain/tokenizer';
import { CHUNKING_REPOSITORY } from './chunking.tokens';

export interface ChunkDocumentVersionCommand {
  documentVersionId: string;
  now: Date;
  chunkerVersion?: string;
  tokenizer?: Tokenizer;
}

@Injectable()
export class ChunkingService {
  constructor(
    @Inject(CHUNKING_REPOSITORY)
    private readonly repository: ChunkingRepository,
  ) {}

  async chunkDocumentVersion(
    command: ChunkDocumentVersionCommand,
  ): Promise<ChunkingResult> {
    const tokenizer = command.tokenizer ?? new WhitespaceTokenizer();
    const documentVersion = await this.repository.findDocumentVersion(
      command.documentVersionId,
    );

    if (!documentVersion) {
      throw new Error('Document version not found');
    }

    const chunkerVersion = command.chunkerVersion ?? DEFAULT_CHUNKER_VERSION;
    const plan = buildChunkingPlan({
      documentVersion,
      tokenizer,
      now: command.now,
      chunkerVersion,
    });

    const existingRun = await this.repository.findRun({
      documentVersionId: plan.run.documentVersionId,
      chunkerVersion: plan.run.chunkerVersion,
      chunkingProfile: plan.run.chunkingProfile,
      tokenizerKey: plan.run.tokenizerKey,
      tokenizerVersion: plan.run.tokenizerVersion,
    });

    if (existingRun?.status === 'chunked') {
      return {
        status: 'already_chunked',
        runId: existingRun.id,
        documentVersionId: existingRun.documentVersionId,
        chunkCount: plan.chunks.length,
      };
    }

    return this.repository.saveChunkingPlan(plan, {
      now: command.now,
    });
  }
}
