import { BadRequestException } from '@nestjs/common';
import {
  SeoPackGeneratorService,
  SeoPackRepository,
} from '@seo-kb/seo-pack';
import { SeoPackController } from './seo-pack.controller';

describe('SeoPackController', () => {
  it('builds and persists an SEO Pack', async () => {
    const pack = {
      topicId: 'topic-1',
      candidateKey: 'candidate-1',
      packKey: 'topic-1:candidate-1:local_page',
      pageType: 'local_page',
      pageBrief: { titleConcept: 'Laser hair removal Jaslo' },
    };
    const generator = {
      generate: jest.fn(() => pack),
    } as unknown as SeoPackGeneratorService;
    const repository = {
      saveSeoPack: jest.fn(async () => ({
        ...pack,
        id: 'seo-pack-1',
        createdAt: '2026-08-14T00:00:00.000Z',
      })),
    } as unknown as SeoPackRepository;
    const controller = new SeoPackController(generator, repository);

    await expect(
      controller.build({
        topicId: 'topic-1',
        candidateKey: 'candidate-1',
        profile: 'local_page',
      }),
    ).resolves.toMatchObject({
      id: 'seo-pack-1',
      pageBrief: { titleConcept: 'Laser hair removal Jaslo' },
    });
    expect(generator.generate).toHaveBeenCalledWith({
      topicId: 'topic-1',
      candidateKey: 'candidate-1',
      profile: 'local_page',
    });
    expect(repository.saveSeoPack).toHaveBeenCalledWith({
      pack,
      createdAt: expect.any(String),
    });
  });

  it('rejects missing topic identity', async () => {
    const controller = new SeoPackController(
      { generate: jest.fn() } as unknown as SeoPackGeneratorService,
      { saveSeoPack: jest.fn() } as unknown as SeoPackRepository,
    );

    await expect(
      controller.build({ topicId: '', candidateKey: 'candidate-1' }),
    ).rejects.toThrow(BadRequestException);
  });

  it('lists generated SEO Packs for a topic', async () => {
    const repository = {
      saveSeoPack: jest.fn(),
      listSeoPacks: jest.fn(async () => [{
        id: 'seo-pack-1',
        topicId: '11111111-1111-4111-8111-111111111111',
        candidateKey: 'candidate-1',
        packKey: 'pack-1',
        pageType: 'local_page',
        createdAt: '2026-08-20T00:00:00.000Z',
      }]),
    } as unknown as SeoPackRepository;
    const controller = new SeoPackController(
      { generate: jest.fn() } as unknown as SeoPackGeneratorService,
      repository,
    );

    await expect(
      controller.listForTopic('11111111-1111-4111-8111-111111111111'),
    ).resolves.toEqual([expect.objectContaining({
      id: 'seo-pack-1',
      candidateKey: 'candidate-1',
    })]);
    expect(repository.listSeoPacks).toHaveBeenCalledWith(
      '11111111-1111-4111-8111-111111111111',
    );
  });
});
