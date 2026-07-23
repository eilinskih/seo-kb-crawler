import { CandidateScoringPack } from '../domain/seo-candidate-scoring-types';

export interface SaveCandidateScoringPackCommand {
  pack: CandidateScoringPack;
  createdAt: string;
}

export interface CandidateScoringPackRecord extends CandidateScoringPack {
  id: string;
  createdAt: string;
}

export interface SeoCandidateScoringRepository {
  saveCandidateScoringPack(
    command: SaveCandidateScoringPackCommand,
  ): Promise<CandidateScoringPackRecord>;
  findLatestCandidateScoringPack(
    topicId: string,
  ): Promise<CandidateScoringPackRecord | null>;
}
