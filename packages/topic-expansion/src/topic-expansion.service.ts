import { Injectable } from '@nestjs/common';
import {
  TopicExpansionPack,
  TopicExpansionRequest,
} from './domain/topic-expansion-types';
import { ExpansionPackService } from './expansion-pack.service';

@Injectable()
export class TopicExpansionService {
  constructor(private readonly expansionPackService = new ExpansionPackService()) {}

  buildExpansionPack(request: TopicExpansionRequest): TopicExpansionPack {
    return this.expansionPackService.build(request);
  }
}
