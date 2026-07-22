import { Injectable } from '@nestjs/common';
import { SerpPack, SerpPackRequest } from './domain/serp-intelligence-types';
import { SerpPackService } from './serp-pack.service';

@Injectable()
export class SerpIntelligenceService {
  constructor(private readonly serpPackService = new SerpPackService()) {}

  buildSerpPack(request: SerpPackRequest): SerpPack {
    return this.serpPackService.build(request);
  }
}
