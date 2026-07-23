import { Controller, Get } from '@nestjs/common';
import { KnexChunkingRepository } from '@seo-kb/chunking';
import { KnexContentProcessingRepository } from '@seo-kb/content-processing';
import { KnexEmbeddingRepository } from '@seo-kb/embeddings';
import { KnexRetrievalRepository } from '@seo-kb/retrieval';

@Controller('operator')
export class OperatorStatusController {
  constructor(
    private readonly contentProcessing: KnexContentProcessingRepository,
    private readonly chunking: KnexChunkingRepository,
    private readonly embeddings: KnexEmbeddingRepository,
    private readonly retrieval: KnexRetrievalRepository,
  ) {}

  @Get('status')
  async status() {
    const [
      contentProcessing,
      contentInspection,
      chunking,
      chunkInspection,
      embeddings,
      retrieval,
    ] = await Promise.all([
      this.contentProcessing.summarizeStatus(),
      this.contentProcessing.summarizeInspection(),
      this.chunking.summarizeStatus(),
      this.chunking.summarizeInspection(),
      this.embeddings.summarizeStatus(),
      this.retrieval.summarizeReadiness(),
    ]);

    return {
      contentProcessing,
      chunking,
      embeddings,
      retrieval,
      inspection: {
        ...contentInspection,
        ...chunkInspection,
      },
    };
  }
}
