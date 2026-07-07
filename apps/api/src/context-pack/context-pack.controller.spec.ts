import { BadRequestException } from '@nestjs/common';
import {
  ContextPackResponse,
  ContextPackService,
  ContextPackValidationError,
} from '@seo-kb/context-pack';
import { ContextPackController } from './context-pack.controller';

describe('ContextPackController', () => {
  it('builds a context pack from the request body', async () => {
    const response = contextPackResponseFixture();
    const service = {
      build: jest.fn(async () => response),
    } as unknown as ContextPackService;
    const controller = new ContextPackController(service);

    await expect(
      controller.build({
        query: 'laser hair removal',
        profile: 'article_generation',
        language: 'en',
        geo: { countryCode: 'PL' },
      }),
    ).resolves.toEqual(response);
    expect(service.build).toHaveBeenCalledWith({
      query: 'laser hair removal',
      profile: 'article_generation',
      language: 'en',
      geo: { countryCode: 'PL' },
    });
  });

  it('maps context pack validation failures to bad requests', async () => {
    const service = {
      build: jest.fn(async () => {
        throw new ContextPackValidationError('query must be a non-empty string');
      }),
    } as unknown as ContextPackService;
    const controller = new ContextPackController(service);

    await expect(
      controller.build({
        query: '',
        profile: 'article_generation',
      }),
    ).rejects.toThrow(BadRequestException);
  });
});

function contextPackResponseFixture(): ContextPackResponse {
  return {
    normalizedQuery: 'laser hair removal',
    profile: 'article_generation',
    sections: [],
    sources: [],
    faqCandidates: [],
    outlineHints: [],
    contentGaps: [],
    retrieval: {
      degraded: false,
      warnings: [],
      resultCount: 0,
    },
  };
}
