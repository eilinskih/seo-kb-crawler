import {
  CandidateScoringPackRecord,
  SaveCandidateScoringPackCommand,
  SeoCandidateScoringRepository,
} from '../persistence/seo-candidate-scoring.repository';

export class InMemorySeoCandidateScoringRepository
  implements SeoCandidateScoringRepository
{
  private readonly packs: CandidateScoringPackRecord[] = [];

  async saveCandidateScoringPack(
    command: SaveCandidateScoringPackCommand,
  ): Promise<CandidateScoringPackRecord> {
    const record = {
      ...command.pack,
      id: `candidate-scoring-pack-${this.packs.length + 1}`,
      createdAt: command.createdAt,
    };
    this.packs.push(record);
    return record;
  }

  async findLatestCandidateScoringPack(
    topicId: string,
  ): Promise<CandidateScoringPackRecord | null> {
    return [...this.packs].reverse().find((pack) => pack.topicId === topicId) ?? null;
  }
}
