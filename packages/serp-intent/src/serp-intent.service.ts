import { Injectable } from '@nestjs/common';
import {
  SerpIntentPack,
  SerpIntentPackRequest,
} from './domain/serp-intent-types';
import { SerpIntentPackService } from './serp-intent-pack.service';

@Injectable()
export class SerpIntentService {
  constructor(private readonly serpIntentPackService = new SerpIntentPackService()) {}

  buildSerpIntentPack(request: SerpIntentPackRequest): SerpIntentPack {
    return this.serpIntentPackService.build(request);
  }
}
