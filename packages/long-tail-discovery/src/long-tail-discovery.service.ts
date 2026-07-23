import { Injectable } from '@nestjs/common';
import {
  LongTailDiscoveryPack,
  LongTailDiscoveryRequest,
} from './domain/long-tail-discovery-types';
import { LongTailDiscoveryPackService } from './long-tail-discovery-pack.service';

@Injectable()
export class LongTailDiscoveryService {
  constructor(
    private readonly packService = new LongTailDiscoveryPackService(),
  ) {}

  buildLongTailDiscoveryPack(
    request: LongTailDiscoveryRequest,
  ): LongTailDiscoveryPack {
    return this.packService.build(request);
  }
}
