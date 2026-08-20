import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Inject,
  Param,
  ParseUUIDPipe,
  Post,
} from '@nestjs/common';
import {
  SEO_PACK_REPOSITORY,
  SeoPackGeneratorService,
  SeoPackRecord,
  SeoPackRepository,
  SeoPackRequest,
} from '@seo-kb/seo-pack';

@Controller('seo-pack')
export class SeoPackController {
  constructor(
    private readonly generator: SeoPackGeneratorService,
    @Inject(SEO_PACK_REPOSITORY)
    private readonly repository: SeoPackRepository,
  ) {}

  @Post()
  async build(@Body() request: SeoPackRequest): Promise<SeoPackRecord> {
    assertSeoPackRequest(request);
    const pack = this.generator.generate(request);

    return this.repository.saveSeoPack({
      pack,
      createdAt: new Date().toISOString(),
    });
  }

  @Get('topics/:topicId')
  listForTopic(
    @Param('topicId', new ParseUUIDPipe({ version: '4' })) topicId: string,
  ): Promise<SeoPackRecord[]> {
    return this.repository.listSeoPacks(topicId);
  }
}

function assertSeoPackRequest(request: SeoPackRequest): void {
  if (!request || typeof request.topicId !== 'string' || request.topicId.trim() === '') {
    throw new BadRequestException('topicId must be a non-empty string');
  }
  if (
    typeof request.candidateKey !== 'string' ||
    request.candidateKey.trim() === ''
  ) {
    throw new BadRequestException('candidateKey must be a non-empty string');
  }
}
