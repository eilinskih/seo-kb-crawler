import {
  BadRequestException,
  Body,
  Controller,
  Post,
} from '@nestjs/common';
import {
  ExternalEntityReviewDecisionRecord,
  ExternalEntityReviewError,
  ExternalEntityReviewService,
  ReviewExternalEntityInput,
} from '@seo-kb/external-entity-enrichment';

@Controller('external-entities/review')
export class ExternalEntityReviewController {
  constructor(private readonly reviews: ExternalEntityReviewService) {}

  @Post()
  async review(
    @Body() input: ReviewExternalEntityInput,
  ): Promise<ExternalEntityReviewDecisionRecord> {
    try {
      return await this.reviews.review(input);
    } catch (error) {
      if (error instanceof ExternalEntityReviewError) {
        throw new BadRequestException(error.message);
      }
      throw error;
    }
  }
}
