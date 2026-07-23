import { CandidateScoringPackService } from '../candidate-scoring-pack.service';
import { InMemorySeoCandidateScoringRepository } from '../testing/in-memory-seo-candidate-scoring.repository';

describe('SeoCandidateScoringRepository', () => {
  it('preserves the latest Candidate Scoring Pack by topic', async () => {
    const repository = new InMemorySeoCandidateScoringRepository();
    const pack = new CandidateScoringPackService().build({
      topicId: 'topic-1',
      candidates: [],
    });

    await repository.saveCandidateScoringPack({
      pack,
      createdAt: '2026-07-23T00:00:00.000Z',
    });

    await expect(
      repository.findLatestCandidateScoringPack('topic-1'),
    ).resolves.toMatchObject({
      id: 'candidate-scoring-pack-1',
      topicId: 'topic-1',
      createdAt: '2026-07-23T00:00:00.000Z',
    });
  });
});
