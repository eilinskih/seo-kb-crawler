import { Injectable } from '@nestjs/common';
import {
  CandidateScoringPack,
  CandidateScoringRequest,
} from './domain/seo-candidate-scoring-types';
import { CandidateScoringPackService } from './candidate-scoring-pack.service';

@Injectable()
export class SeoCandidateScoringService {
  constructor(
    private readonly packService = new CandidateScoringPackService(),
  ) {}

  buildCandidateScoringPack(
    request: CandidateScoringRequest,
  ): CandidateScoringPack {
    return this.packService.build(request);
  }
}
