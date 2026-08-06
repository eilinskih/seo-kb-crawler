import { BadRequestException } from '@nestjs/common';
import {
  ExternalEntityReviewError,
  ExternalEntityReviewService,
} from '@seo-kb/external-entity-enrichment';
import { ExternalEntityReviewController } from './external-entity-review.controller';

describe('ExternalEntityReviewController', () => {
  it('records external entity review decisions through the service boundary', async () => {
    const response = {
      id: 'review-1',
      decision: 'accepted',
    };
    const service = {
      review: jest.fn(async () => response),
    } as unknown as ExternalEntityReviewService;
    const controller = new ExternalEntityReviewController(service);

    await expect(controller.review({
      attemptId: 'pack-1',
      subjectType: 'external_id',
      providerKey: 'google_knowledge_graph',
      externalId: 'kg:/m/test',
      externalIdType: 'google_kg_id',
      decision: 'accepted',
      reviewedBy: 'operator',
    })).resolves.toBe(response);

    expect(service.review).toHaveBeenCalledWith({
      attemptId: 'pack-1',
      subjectType: 'external_id',
      providerKey: 'google_knowledge_graph',
      externalId: 'kg:/m/test',
      externalIdType: 'google_kg_id',
      decision: 'accepted',
      reviewedBy: 'operator',
    });
  });

  it('maps review validation failures to bad requests', async () => {
    const service = {
      review: jest.fn(async () => {
        throw new ExternalEntityReviewError('missing evidence');
      }),
    } as unknown as ExternalEntityReviewService;
    const controller = new ExternalEntityReviewController(service);

    await expect(controller.review({
      attemptId: 'pack-1',
      subjectType: 'external_id',
      providerKey: 'google_knowledge_graph',
      externalId: 'kg:/m/missing',
      externalIdType: 'google_kg_id',
      decision: 'accepted',
      reviewedBy: 'operator',
    })).rejects.toBeInstanceOf(BadRequestException);
  });
});
